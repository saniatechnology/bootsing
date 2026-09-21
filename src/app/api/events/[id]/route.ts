import { NextResponse } from "next/server";
import { readEvents, updateEvent, deleteEvent } from "@/lib/store";
import { eventPatchSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = eventPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateEvent(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: `No event with id ${id}` }, { status: 404 });
    }
    const events = await readEvents();
    return NextResponse.json({ event: updated, events });
  } catch (err) {
    console.error("[PATCH /api/events/[id]]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  try {
    const removed = await deleteEvent(id);
    if (!removed) {
      return NextResponse.json({ error: `No event with id ${id}` }, { status: 404 });
    }
    const events = await readEvents();
    return NextResponse.json({ event: removed, events });
  } catch (err) {
    console.error("[DELETE /api/events/[id]]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
