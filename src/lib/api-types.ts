/**
 * The JSON shapes the API routes return, shared by the route handlers (which
 * annotate their responses with them) and the browser-side client in
 * `api.ts`. Keeping them here — rather than in the server modules that
 * produce them — lets client code import them without pulling in
 * `server-only` modules.
 */

import type { CalendarEvent, CalendarMeta } from "./types";
import type { Preferences, ProposedAction } from "./validation";

/** Every error response, whatever the status. */
export interface ApiErrorBody {
  error: string;
}

/** The full, current event list; every mutation returns it so the client can replace its state. */
export interface EventsResponse {
  events: CalendarEvent[];
}

/** `GET /api/events`. */
export interface CalendarResponse extends EventsResponse {
  meta: CalendarMeta;
}

/** `POST /api/events`, `PATCH|DELETE /api/events/[id]`: the affected event plus the new full list. */
export interface EventMutationResponse extends EventsResponse {
  event: CalendarEvent;
}

/** The final `done` payload of `POST /api/chat`. */
export interface ChatApiResponse {
  reply: string;
  /** Pending changes for the user to approve; empty when the assistant only answered. */
  proposedActions: ProposedAction[];
  /**
   * The conversation so far, to be sent back verbatim on the next turn. Opaque
   * to the client: it is the Anthropic SDK's message array serialised as JSON.
   */
  history: unknown[];
}

/** Outcome of one approved action in `POST /api/chat/apply`. */
export interface AppliedAction {
  actionId: string;
  ok: boolean;
  summary: string;
  error?: string;
}

/** `POST /api/chat/apply`. */
export interface ApplyApiResponse extends EventsResponse {
  applied: AppliedAction[];
  /** A short human summary of what was and wasn't applied, shown in the chat. */
  reply: string;
}

/** The final `done` payload of `POST /api/research`. */
export interface ResearchApiResponse extends EventsResponse {
  added: number;
  removed: number;
  reply: string;
}

/** `GET|PUT /api/preferences`. */
export interface PreferencesResponse {
  preferences: Preferences;
}

/** The signed-in account, as returned by the auth routes. */
export interface AuthUser {
  username: string;
  email: string | null;
}

/** `POST /api/auth/login` and `PATCH /api/auth/account`. */
export interface AuthResponse {
  user: AuthUser;
}

/** `POST /api/auth/logout` and `DELETE /api/auth/account`. */
export interface OkResponse {
  ok: true;
}
