import { z } from "zod";
import { runChatTurn } from "@/lib/chat";
import { apiRoute, parseJsonBody } from "@/lib/http";
import { ndjsonResponse } from "@/lib/progress";

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

/** Streams progress as NDJSON; the final `done` event carries a `ChatApiResponse`. */
export const POST = apiRoute("POST /api/chat", async (request) => {
  const { message, history, selectedIds } = await parseJsonBody(request, chatRequestSchema);
  return ndjsonResponse((emit) =>
    runChatTurn(message, history as Parameters<typeof runChatTurn>[1], selectedIds, emit)
  );
});
