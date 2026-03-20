import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json({
      response: `✅ This is a simulated LLM response. Your masked prompt was received successfully. In production this would be sent to OpenAI. Prompt length: ${text.length} characters.`,
    });
  } catch (err) {
    console.error("[/api/send]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
