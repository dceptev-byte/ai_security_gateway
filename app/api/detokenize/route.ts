import { NextResponse } from "next/server";
import { tokenMaps, purgeExpired } from "@/lib/token-store";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("text" in body) ||
      !("tokenMapId" in body) ||
      typeof (body as Record<string, unknown>).text !== "string" ||
      typeof (body as Record<string, unknown>).tokenMapId !== "string" ||
      (body as Record<string, string>).text.trim() === "" ||
      (body as Record<string, string>).tokenMapId.trim() === ""
    ) {
      return NextResponse.json(
        { error: "text and tokenMapId must be non-empty strings" },
        { status: 400 }
      );
    }

    const { text, tokenMapId } = body as Record<string, string>;

    // Purge stale entries on every request
    purgeExpired();

    const entry = tokenMaps.get(tokenMapId);
    if (!entry) {
      return NextResponse.json(
        { error: "Token map not found or expired" },
        { status: 404 }
      );
    }

    let restoredText = text;
    let tokensRestored = 0;

    for (const [token, originalValue] of Object.entries(entry.map)) {
      if (restoredText.includes(token)) {
        // Replace all occurrences of this token
        restoredText = restoredText.split(token).join(originalValue);
        tokensRestored++;
      }
    }

    return NextResponse.json({
      restoredText,
      tokensRestored,
      originalTokenMapId: tokenMapId,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
