import type { EventMutationResponse } from "@/lib/api-types";
import { HttpError, apiRoute, jsonResponse, parseJsonBody, parsePositiveInt } from "@/lib/http";
import { deleteEvent, readEvents, updateEvent } from "@/lib/store";
import { eventPatchSchema } from "@/lib/validation";

type Params = { id: string };

export const PATCH = apiRoute<Params>("PATCH /api/events/[id]", async (request, { params }) => {
  const id = parsePositiveInt((await params).id, "event id");
  const patch = await parseJsonBody(request, eventPatchSchema);
  const updated = await updateEvent(id, patch);
  if (!updated) throw new HttpError(404, `No event with id ${id}`);
  const events = await readEvents();
  return jsonResponse<EventMutationResponse>({ event: updated, events });
});

export const DELETE = apiRoute<Params>("DELETE /api/events/[id]", async (_request, { params }) => {
  const id = parsePositiveInt((await params).id, "event id");
  const removed = await deleteEvent(id);
  if (!removed) throw new HttpError(404, `No event with id ${id}`);
  const events = await readEvents();
  return jsonResponse<EventMutationResponse>({ event: removed, events });
});
