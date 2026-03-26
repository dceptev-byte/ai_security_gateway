import { NextResponse } from "next/server";
import { detectPII, scoreRisk } from "@/lib/pii-detector";
import { tokenMaps, purgeExpired } from "@/lib/token-store";
import { randomUUID } from "crypto";
import type { Finding, PIIType } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8).padEnd(6, "0");
}

const NER_VALID_TYPES = new Set<string>(["NAME", "ADDRESS", "ORG", "DATE"]);

async function callNERService(
  text: string
): Promise<{ findings: Finding[]; available: boolean }> {
  try {
    const res = await fetch("http://localhost:5001/ner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { findings: [], available: false };

    const data = (await res.json()) as {
      findings: Array<{
        type: string;
        value: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    };

    const findings: Finding[] = (data.findings ?? [])
      .filter((f) => NER_VALID_TYPES.has(f.type))
      .map((f) => ({
        type: f.type as PIIType,
        value: f.value,
        start: f.start,
        end: f.end,
        confidence: f.confidence,
      }));

    return { findings, available: true };
  } catch {
    console.error("[tokenize] NER service unavailable — proceeding with regex only");
    return { findings: [], available: false };
  }
}

/** Merge regex and NER findings. On duplicate values, regex wins (higher confidence). */
function mergeFindings(
  regexFindings: Finding[],
  nerFindings: Finding[]
): { merged: Finding[]; nerCount: number } {
  const regexValues = new Set(regexFindings.map((f) => f.value));
  const nerUnique = nerFindings.filter((f) => !regexValues.has(f.value));
  return {
    merged: [...regexFindings, ...nerUnique],
    nerCount: nerUnique.length,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("text" in body) ||
      typeof (body as Record<string, unknown>).text !== "string" ||
      (body as Record<string, string>).text.trim() === ""
    ) {
      return NextResponse.json(
        { error: "text must be a non-empty string" },
        { status: 400 }
      );
    }

    const text = (body as Record<string, string>).text;

    // Purge stale entries on every request
    purgeExpired();

    // Detect PII — regex (always) + NER (opportunistic)
    const regexFindings = detectPII(text);
    const { findings: nerFindings, available: nerServiceAvailable } =
      await callNERService(text);

    const { merged: findings, nerCount } = mergeFindings(
      regexFindings,
      nerFindings
    );

    const riskLevel = scoreRisk(findings);

    // Build value → token map (same value always gets same token within this call)
    const valueToToken = new Map<string, string>();
    for (const f of findings) {
      if (!valueToToken.has(f.value)) {
        const token = `[${f.type}_${randomSuffix()}]`;
        valueToToken.set(f.value, token);
      }
    }

    // Replace right-to-left to preserve indices
    const sorted = [...findings].sort((a, b) => b.start - a.start);
    let tokenizedText = text;
    for (const f of sorted) {
      const token = valueToToken.get(f.value);
      if (token === undefined) continue;
      tokenizedText =
        tokenizedText.slice(0, f.start) + token + tokenizedText.slice(f.end);
    }

    // Invert: token → original value for detokenization
    const tokenMap: Record<string, string> = {};
    for (const [value, token] of valueToToken) {
      tokenMap[token] = value;
    }

    const tokenMapId = randomUUID();
    tokenMaps.set(tokenMapId, { map: tokenMap, createdAt: new Date(), text });

    return NextResponse.json({
      tokenizedText,
      tokenMapId,
      findings,
      riskLevel,
      tokenCount: Object.keys(tokenMap).length,
      nerServiceAvailable,
      detectionBreakdown: {
        regexCount: regexFindings.length,
        nerCount,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
