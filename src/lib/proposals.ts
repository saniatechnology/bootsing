/**
 * Turns the mutating tool calls Claude makes (add/edit/delete) into
 * `ProposedAction`s: validated, resolved against the current events, and
 * summarised in one line for the user to approve or reject. Pure — the chat
 * loop hands it tool calls and the current event list, nothing else.
 */

import { summarizeEvent } from "./events";
import type { CalendarEvent } from "./types";
import {
  deleteEventToolInputSchema,
  editEventToolInputSchema,
  newEventInputSchema,
} from "./validation";
import type { EventPatch, ProposedAction } from "./validation";

/** The parts of a `tool_use` block this module needs. */
export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export const ADD_EVENT_TOOL_NAME = "add_event";
export const EDIT_EVENT_TOOL_NAME = "edit_event";
export const DELETE_EVENT_TOOL_NAME = "delete_event";

function dateLabel(start: string, end: string): string {
  return start === end ? start : `${start} to ${end}`;
}

/**
 * Builds the proposal for one mutating tool call. Returns null when the call
 * is unusable — input that fails validation, or an id that no longer exists —
 * so it's silently dropped rather than shown as something that can't be done.
 * The same schemas re-validate the proposal when it comes back to be applied,
 * so nothing accepted here can fail validation later.
 */
export function buildProposedAction(
  call: ToolCall,
  events: readonly CalendarEvent[]
): ProposedAction | null {
  switch (call.name) {
    case ADD_EVENT_TOOL_NAME: {
      const parsed = newEventInputSchema.safeParse(call.input);
      if (!parsed.success) return null;
      const input = parsed.data;
      return {
        id: call.id,
        kind: "add",
        input,
        summary: `Add "${input.name}" at ${input.venue} (${dateLabel(input.start, input.end)})`,
      };
    }
    case EDIT_EVENT_TOOL_NAME: {
      const parsed = editEventToolInputSchema.safeParse(call.input);
      if (!parsed.success) return null;
      const { id: targetId, ...patch } = parsed.data;
      const target = events.find((e) => e.id === targetId);
      if (!target) return null;
      return {
        id: call.id,
        kind: "edit",
        targetId,
        patch,
        target: summarizeEvent(target),
        summary: `Edit "${target.name}": ${describePatch(patch)}`,
      };
    }
    case DELETE_EVENT_TOOL_NAME: {
      const parsed = deleteEventToolInputSchema.safeParse(call.input);
      if (!parsed.success) return null;
      const target = events.find((e) => e.id === parsed.data.id);
      if (!target) return null;
      return {
        id: call.id,
        kind: "delete",
        targetId: target.id,
        target: summarizeEvent(target),
        summary: `Delete "${target.name}" at ${target.venue}`,
      };
    }
    default:
      return null;
  }
}

/** Human labels for patch fields; typed as a full record so a new field can't be forgotten. */
const PATCH_FIELD_LABELS: Record<keyof EventPatch, string> = {
  name: "name",
  venue: "venue",
  cat: "category",
  start: "start",
  end: "end",
  startTime: "start time",
  endTime: "end time",
  cost: "cost",
  desc: "description",
  link: "link",
  approx: "approx flag",
  genre: "genre",
  status: "status",
};

/** e.g. `start → "2026-09-12", cost → "Free"`, or "no changes" for an empty patch. */
export function describePatch(patch: EventPatch): string {
  const parts = Object.entries(patch).map(
    ([key, value]) =>
      `${PATCH_FIELD_LABELS[key as keyof EventPatch] ?? key} → ${JSON.stringify(value)}`
  );
  return parts.length > 0 ? parts.join(", ") : "no changes";
}
