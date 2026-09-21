import { z } from "zod";
import type { ApplyApiResponse } from "@/lib/api-types";
import { applyActions } from "@/lib/apply";
import { apiRoute, jsonResponse, parseJsonBody } from "@/lib/http";
import { proposedActionSchema } from "@/lib/validation";

// The apply endpoint writes to the database, so the client-supplied actions
// are fully re-validated with the same schemas that built them.
const applyRequestSchema = z.object({
  actions: z.array(proposedActionSchema).min(1, "no actions to apply"),
});

export const POST = apiRoute("POST /api/chat/apply", async (request) => {
  const { actions } = await parseJsonBody(request, applyRequestSchema);
  return jsonResponse<ApplyApiResponse>(await applyActions(actions));
});
