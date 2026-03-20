import { NextRequest, NextResponse } from "next/server";
import { detectPII, maskPII, scoreRisk } from "@/lib/pii-detector";

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

    const text = (body as Record<string, unknown>).text as string;
    const findings = detectPII(text);
    const maskedText = maskPII(text, findings);
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
