import { NextResponse } from "next/server";
import { z } from "zod";
import { runChatTurn } from "@/lib/chat";

const chatRequestSchema = z.object({
  message: z.string().min(1, "message is required"),
  // The message history round-trips through the client as opaque JSON — it's
  // whatever the SDK's MessageParam[] serialized to on the previous response,
  // so it isn't re-validated field by field here, only shaped as an array.
  history: z.array(z.unknown()).default([]),
  // Event ids the user has manually ticked in the UI, given to the assistant
  // as context so it can act on "these" without searching.
  selectedIds: z.array(z.number().int()).default([]),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const result = await runChatTurn(
      parsed.data.message,
      parsed.data.history as Parameters<typeof runChatTurn>[1],
      parsed.data.selectedIds
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/chat]", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
