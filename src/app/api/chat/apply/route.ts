import { NextResponse } from "next/server";
import { z } from "zod";
import { applyActions } from "@/lib/apply";
import { CATEGORY_KEYS, GENRE_KEYS } from "@/lib/types";
import type { ProposedAction } from "@/lib/types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be ISO yyyy-mm-dd");
const category = z.enum(CATEGORY_KEYS);
const genre = z.enum(GENRE_KEYS);

const newEventInput = z.object({
  name: z.string().min(1),
  venue: z.string().min(1),
  cat: category,
  start: isoDate,
  end: isoDate,
  cost: z.string(),
  desc: z.string(),
  link: z.string(),
  approx: z.boolean().optional(),
  genre: genre.optional(),
});

const eventPatch = z.object({
  name: z.string().optional(),
  venue: z.string().optional(),
  cat: category.optional(),
  start: isoDate.optional(),
  end: isoDate.optional(),
  cost: z.string().optional(),
  desc: z.string().optional(),
  link: z.string().optional(),
  approx: z.boolean().optional(),
  genre: genre.nullable().optional(),
});

const eventSummary = z.object({
  id: z.number().int(),
  name: z.string(),
  venue: z.string(),
  start: z.string(),
  end: z.string(),
});

// Mirrors the ProposedAction union in types.ts; the apply endpoint writes to
// disk, so the client-supplied actions are fully re-validated at this boundary.
const proposedAction = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("add"), summary: z.string(), input: newEventInput }),
  z.object({
    id: z.string(),
    kind: z.literal("edit"),
    summary: z.string(),
    targetId: z.number().int(),
    patch: eventPatch,
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
