/**
 * The browser's typed client for the app's own API routes. Every call here
 * maps to one route, shares the response types in `api-types.ts` with the
 * server, and throws `ApiError` on failure so components can show the
 * server's message without re-implementing `res.ok` / `data.error` checks.
 * Event mutations resolve with the full, current event list, which is what
 * every caller replaces its state with.
 */

import type {
  ApiErrorBody,
  ApplyApiResponse,
  ChatApiResponse,
  EventMutationResponse,
  PreferencesResponse,
  ResearchApiResponse,
} from "./api-types";
import { readProgressStream } from "./progress";
import type { ProgressEvent } from "./progress";
import type { CalendarEvent } from "./types";
import type { EventPatch, NewEventInput, Preferences, ProposedAction } from "./validation";
import type { WeekRange } from "./weeks";

export class ApiError extends Error {
  constructor(
    message: string,
    /** The HTTP status, or 0 when the failure happened inside a successful stream. */
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** True when a request was cancelled via its AbortSignal (not something to show the user). */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/** A message safe to show the user for any thrown value. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

async function errorFrom(res: Response, fallback: string): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as Partial<ApiErrorBody> | null;
  return new ApiError(body?.error ?? fallback, res.status);
}

function jsonInit(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  };
}

async function request<T>(url: string, init: RequestInit, fallback: string): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw await errorFrom(res, fallback);
  return (await res.json()) as T;
}

/**
 * POST to a streaming (NDJSON) route. Progress events are forwarded to
 * `onProgress`; the promise resolves with the `done` payload, and rejects
 * with an `ApiError` if the server sent an `error` event or the stream ended
 * without finishing.
 */
async function streamRequest<T>(
  url: string,
  body: unknown,
  signal: AbortSignal | undefined,
  onProgress: (event: ProgressEvent) => void,
  fallback: string
): Promise<T> {
  const res = await fetch(url, jsonInit("POST", body, signal));
  if (!res.ok) throw await errorFrom(res, fallback);

  const outcome: { data?: T; error?: string } = {};
  await readProgressStream(res, (event) => {
    if (event.type === "done") outcome.data = event.data as T;
    else if (event.type === "error") outcome.error = event.message;
    else onProgress(event);
  });
  if (outcome.error !== undefined) throw new ApiError(outcome.error, 0);
  if (!("data" in outcome)) throw new ApiError("The response ended before it finished.", 0);
  return outcome.data as T;
}

export interface ChatRequest {
  message: string;
  /** The `history` from the previous `ChatApiResponse`, or `[]` for a new conversation. */
  history: unknown[];
  selectedIds: number[];
}

export const api = {
  async createEvent(input: NewEventInput): Promise<CalendarEvent[]> {
    const { events } = await request<EventMutationResponse>(
      "/api/events",
      jsonInit("POST", input),
      "Couldn't add the event."
    );
    return events;
  },

  async updateEvent(id: number, patch: EventPatch): Promise<CalendarEvent[]> {
    const { events } = await request<EventMutationResponse>(
      `/api/events/${id}`,
      jsonInit("PATCH", patch),
      "Couldn't update the event."
    );
    return events;
  },

  async deleteEvent(id: number): Promise<CalendarEvent[]> {
    const { events } = await request<EventMutationResponse>(
      `/api/events/${id}`,
      { method: "DELETE" },
      "Couldn't delete the event."
    );
    return events;
  },

  /**
   * Apply the same patch to several events, one request at a time so the
   * returned list reflects every change. `ids` must not be empty.
   */
  async updateEvents(ids: readonly number[], patch: EventPatch): Promise<CalendarEvent[]> {
    if (ids.length === 0) throw new ApiError("No events selected.", 400);
    let events: CalendarEvent[] = [];
    for (const id of ids) events = await api.updateEvent(id, patch);
    return events;
  },

  /** Delete several events, one request at a time. `ids` must not be empty. */
  async deleteEvents(ids: readonly number[]): Promise<CalendarEvent[]> {
    if (ids.length === 0) throw new ApiError("No events selected.", 400);
    let events: CalendarEvent[] = [];
    for (const id of ids) events = await api.deleteEvent(id);
    return events;
  },

  async savePreferences(prefs: Preferences): Promise<Preferences> {
    const { preferences } = await request<PreferencesResponse>(
      "/api/preferences",
      jsonInit("PUT", prefs),
      "Couldn't save your preferences."
    );
    return preferences;
  },

  chat(
    body: ChatRequest,
    signal: AbortSignal | undefined,
    onProgress: (event: ProgressEvent) => void
  ): Promise<ChatApiResponse> {
    return streamRequest("/api/chat", body, signal, onProgress, "The chat request failed.");
  },

  applyActions(actions: ProposedAction[]): Promise<ApplyApiResponse> {
    return request("/api/chat/apply", jsonInit("POST", { actions }), "Couldn't apply the changes.");
  },

  research(
    [weekStart, weekEnd]: WeekRange,
    signal: AbortSignal | undefined,
    onProgress: (event: ProgressEvent) => void
  ): Promise<ResearchApiResponse> {
    return streamRequest(
      "/api/research",
      { weekStart, weekEnd },
      signal,
      onProgress,
      "Couldn't research this week."
    );
  },
};
