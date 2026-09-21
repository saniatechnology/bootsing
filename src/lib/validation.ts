/**
 * The single source of truth for every shape that crosses a trust boundary:
 * request bodies, Claude tool inputs, and the change proposals the chat round-
 * trips through the browser. Each field is declared once in `eventFields`;
 * the request schemas, the input types (`z.infer`) and the JSON Schema sent
 * to Claude as tool definitions (`toolInputSchema`) are all derived from it,
 * so a field added here is validated everywhere and described to the model
 * the same way.
 */

import { z } from "zod";
import { CATEGORY_KEYS, EVENT_STATUS_KEYS, GENRE_KEYS, GROUP_KEYS } from "./types";

// ---- Scalars ----

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be ISO yyyy-mm-dd");
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be 24h HH:MM");
export const category = z.enum(CATEGORY_KEYS);
export const genre = z.enum(GENRE_KEYS);
export const group = z.enum(GROUP_KEYS);
export const eventStatus = z.enum(EVENT_STATUS_KEYS);
export const eventId = z.number().int().positive();

/**
 * An absolute http(s) URL, or empty when there is no link. Links are rendered
 * as `href`s and may come from the model, so other schemes (`javascript:`,
 * `data:`) and relative paths are rejected at every boundary.
 */
export const httpUrlOrEmpty = z.union([z.literal(""), z.url({ protocol: /^https?$/ })]);

// ---- Events ----

/** Every event field, fully required. Descriptions double as the tool-schema text Claude reads. */
const eventFields = {
  name: z.string().min(1, "name is required").describe("Event title"),
  venue: z.string().min(1, "venue is required").describe("Venue or location"),
  cat: category.describe("Category key"),
  start: isoDate.describe("Start date, ISO yyyy-mm-dd"),
  end: isoDate.describe("End date, ISO yyyy-mm-dd; the same as start for a single-day event"),
  startTime: timeOfDay.describe("Start time, 24h HH:MM; omit when unknown"),
  endTime: timeOfDay.describe("End time, 24h HH:MM; omit when unknown"),
  cost: z.string().describe('e.g. "Free", "Paid", "€15", "Unknown"'),
  desc: z.string().describe("One or two factual sentences"),
  link: httpUrlOrEmpty.describe("URL for more info: the most specific source page you have"),
  approx: z.boolean().describe("True if the date is approximate/unconfirmed"),
  genre: genre.describe("Only for the MUS category: music genre tag used by the dance filter"),
};

/** A brand-new event. `id` is assigned by the store; times, `approx` and `genre` are optional. */
export const newEventInputSchema = z.object({
  ...eventFields,
  startTime: eventFields.startTime.nullish(),
  endTime: eventFields.endTime.nullish(),
  approx: eventFields.approx.optional(),
  genre: eventFields.genre.nullish(),
});
export type NewEventInput = z.infer<typeof newEventInputSchema>;

/** A partial change to an existing event. Nullable fields may be explicitly cleared with `null`. */
export const eventPatchSchema = z.object(eventFields).partial().extend({
  startTime: eventFields.startTime.nullable().optional(),
  endTime: eventFields.endTime.nullable().optional(),
  genre: eventFields.genre.nullable().optional(),
  status: eventStatus.nullable().optional(),
});
export type EventPatch = z.infer<typeof eventPatchSchema>;

/** The subset of an event shown when previewing a proposed edit/delete. */
export const eventSummarySchema = z.object({
  id: eventId,
  name: z.string(),
  venue: z.string(),
  start: isoDate,
  end: isoDate,
});
export type EventSummary = z.infer<typeof eventSummarySchema>;

// ---- Claude tool inputs ----

const targetId = eventId.describe("The event's id, as returned by find_events");

/** `edit_event`: the target id plus any fields to change. The user's Home status is not the model's to set. */
export const editEventToolInputSchema = z
  .object({ id: targetId })
  .extend(eventPatchSchema.omit({ status: true }).shape);

/** `delete_event`. */
export const deleteEventToolInputSchema = z.object({ id: targetId });

/** `find_events`: every filter optional; they combine with AND. */
export const findEventsInputSchema = z
  .object({
    query: z.string().describe("Case-insensitive substring matched against name and venue"),
    group: group.describe("Filter group"),
    genre: genre.describe("Music genre tag"),
    cat: category.describe("Category key"),
    from: isoDate.describe("Range start, ISO yyyy-mm-dd; matches events ending on/after it"),
    to: isoDate.describe("Range end, ISO yyyy-mm-dd; matches events starting on/before it"),
  })
  .partial();
export type FindEventsInput = z.infer<typeof findEventsInputSchema>;

/** `submit_week_events`: the research pass's single structured result. */
export const submitWeekEventsInputSchema = z.object({
  events: z
    .array(newEventInputSchema)
    .describe("All events found for the week; may be empty if none were sourced"),
});

/** The shape the Anthropic SDK accepts as a tool's `input_schema`. */
export interface ToolInputSchema {
  type: "object";
  properties?: unknown;
  required?: string[];
  [k: string]: unknown;
}

/** JSON Schema (draft 2020-12) for a Claude tool definition, derived from a zod object schema. */
export function toolInputSchema(schema: z.ZodObject): ToolInputSchema {
  // The SDK rejects the `$schema` meta key; everything else is standard JSON Schema.
  const json = { ...z.toJSONSchema(schema) };
  delete json.$schema;
  return json as ToolInputSchema;
}

// ---- Change proposals (chat -> user approval -> apply) ----

/**
 * A single change the assistant proposes but has NOT yet applied. The user
 * approves each action individually; only the accepted ones are then replayed
 * server-side (see `applyActions`). `id` is the originating tool-use id, unique
 * within a proposal, and is what the UI keys its per-action toggles on.
 */
export const proposedActionSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    kind: z.literal("add"),
    summary: z.string(),
    input: newEventInputSchema,
  }),
  z.object({
    id: z.string(),
    kind: z.literal("edit"),
    summary: z.string(),
    targetId: eventId,
    patch: eventPatchSchema,
    target: eventSummarySchema,
  }),
  z.object({
    id: z.string(),
    kind: z.literal("delete"),
    summary: z.string(),
    targetId: eventId,
    target: eventSummarySchema,
  }),
]);
export type ProposedAction = z.infer<typeof proposedActionSchema>;

// ---- Preferences (the editable Configuration page) ----

const preferenceItemSchema = z.object({
  label: z.string().min(1, "each item needs a label"),
  detail: z.string().optional(),
});

const preferenceSectionSchema = z.object({
  title: z.string().min(1, "each section needs a title"),
  note: z.string().optional(),
  items: z.array(preferenceItemSchema),
  /** Shown when `items` is empty, e.g. "None yet." */
  emptyText: z.string().optional(),
});

/** The user's event-gathering preferences, fed verbatim into the research prompt. */
export const preferencesSchema = z.object({
  intro: z.string(),
  sections: z.array(preferenceSectionSchema),
});
export type PreferenceItem = z.infer<typeof preferenceItemSchema>;
export type PreferenceSection = z.infer<typeof preferenceSectionSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
