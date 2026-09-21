import { NextResponse } from "next/server";
import { readEvents, readMeta, insertEvent } from "@/lib/store";
import { newEventInputSchema } from "@/lib/validation";

export async function GET() {
  const [events, meta] = await Promise.all([readEvents(), readMeta()]);
  return NextResponse.json({ events, meta });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = newEventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const event = await insertEvent(parsed.data);
    const events = await readEvents();
    return NextResponse.json({ event, events }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/events]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
