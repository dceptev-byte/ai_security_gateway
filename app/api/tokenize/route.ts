import { NextResponse } from "next/server";
import { detectPII, scoreRisk } from "@/lib/pii-detector";
import { tokenMaps, purgeExpired } from "@/lib/token-store";
import { randomUUID } from "crypto";

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8).padEnd(6, "0");
}

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

    const findings = detectPII(text);
    const riskLevel = scoreRisk(findings);

    // Build value → token map (same value always gets the same token)
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
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
