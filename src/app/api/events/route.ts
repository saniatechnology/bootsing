import type { CalendarResponse, EventMutationResponse } from "@/lib/api-types";
import { apiRoute, jsonResponse, parseJsonBody } from "@/lib/http";
import { insertEvent, readEvents, readMeta } from "@/lib/store";
import { newEventInputSchema } from "@/lib/validation";

export const GET = apiRoute("GET /api/events", async () => {
  const [events, meta] = await Promise.all([readEvents(), readMeta()]);
  return jsonResponse<CalendarResponse>({ events, meta });
});

export const POST = apiRoute("POST /api/events", async (request) => {
  const input = await parseJsonBody(request, newEventInputSchema);
  const event = await insertEvent(input);
  const events = await readEvents();
  return jsonResponse<EventMutationResponse>({ event, events }, { status: 201 });
});
