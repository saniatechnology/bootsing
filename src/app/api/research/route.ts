import { NextResponse } from "next/server";
import { z } from "zod";
import { isoDate } from "@/lib/validation";
import { researchAndReplaceWeek, isResearchableWeek } from "@/lib/research";
import { ndjsonResponse } from "@/lib/progress";

// Research uses web search + generation and can take a while; give it room.
export const maxDuration = 120;

const researchRequestSchema = z.object({
  weekStart: isoDate,
  weekEnd: isoDate,
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = researchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { weekStart, weekEnd } = parsed.data;

  try {
    if (!(await isResearchableWeek(weekStart, weekEnd))) {
      return NextResponse.json({ error: "Unknown week." }, { status: 400 });
    }
    return ndjsonResponse((emit) => researchAndReplaceWeek(weekStart, weekEnd, emit));
  } catch (err) {
    console.error("[/api/research]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
