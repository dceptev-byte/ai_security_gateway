import { NextRequest, NextResponse } from "next/server";
import { detectPII, maskPII, scoreRisk } from "@/lib/pii-detector";
import type { AnonymizationMode } from "@/types";

const VALID_MODES = new Set<AnonymizationMode>(["MASK", "REDACT", "REPLACE"]);

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).text !== "string" ||
      ((body as Record<string, unknown>).text as string).trim() === ""
    ) {
      return NextResponse.json(
        { error: "Invalid request: text must be a non-empty string." },
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;
    const text = b.text as string;
    const rawMode = b.mode;
    const mode: AnonymizationMode =
      typeof rawMode === "string" && VALID_MODES.has(rawMode as AnonymizationMode)
        ? (rawMode as AnonymizationMode)
        : "MASK";

    const findings = detectPII(text);
    const maskedText = maskPII(text, findings, mode);
    const riskLevel = scoreRisk(findings);

    return NextResponse.json({ riskLevel, findings, maskedText });
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
