import { NextResponse } from "next/server";
import { z } from "zod";
import { applyActions } from "@/lib/apply";
import { proposedActionSchema } from "@/lib/validation";

// The apply endpoint writes to the database, so the client-supplied actions
// are fully re-validated with the same schemas that built them.
const applyRequestSchema = z.object({
  actions: z.array(proposedActionSchema).min(1, "no actions to apply"),
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
    const result = await applyActions(parsed.data.actions);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/chat/apply]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
