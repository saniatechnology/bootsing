import { NextResponse } from "next/server";
import { z } from "zod";
import { applyActions } from "@/lib/apply";
import { newEventInputSchema, eventPatchSchema } from "@/lib/validation";
import type { ProposedAction } from "@/lib/types";

const eventSummary = z.object({
  id: z.number().int(),
  name: z.string(),
  venue: z.string(),
  start: z.string(),
  end: z.string(),
});

// Mirrors the ProposedAction union in types.ts; the apply endpoint writes to
// the database, so the client-supplied actions are fully re-validated here.
const proposedAction = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("add"), summary: z.string(), input: newEventInputSchema }),
  z.object({
    id: z.string(),
    kind: z.literal("edit"),
    summary: z.string(),
    targetId: z.number().int(),
    patch: eventPatchSchema,
    target: eventSummary,
  }),
  z.object({
    id: z.string(),
    kind: z.literal("delete"),
    summary: z.string(),
    targetId: z.number().int(),
    target: eventSummary,
  }),
]);

const applyRequestSchema = z.object({
  actions: z.array(proposedAction).min(1, "no actions to apply"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = applyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const result = await applyActions(parsed.data.actions as ProposedAction[]);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/chat/apply]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
