import "server-only";

import { getSupabaseClient, getCurrentUserId } from "./supabase";
import { materializeNewEvent } from "./events";
import type {
  CalendarEvent,
  CalendarMeta,
  CategoryKey,
  CategoryMeta,
  GenreKey,
  GroupKey,
  IsoDate,
} from "./types";
import type { EventPatch, NewEventInput, Preferences, PreferenceSection } from "./validation";

/**
 * The persistence layer for Bootsing, backed by Supabase (Postgres). Every
 * read/write scopes to the current user id, so this module is the single place
 * that would change to support real multi-user auth later.
 *
 * Postgres reserved words forced a column rename (start->starts, end->ends,
 * desc->description); the mapping to and from the domain model lives here.
 */

// ---- Events ----

/**
 * Domain field -> `events` column. Declared once and used for the select list,
 * inserts and patches, so adding a field to `CalendarEvent` without mapping it
 * here is a compile error rather than a silently ignored write.
 */
const EVENT_COLUMN_MAP = {
  name: "name",
  venue: "venue",
  cat: "cat",
  start: "starts",
  end: "ends",
  startTime: "start_time",
  endTime: "end_time",
  cost: "cost",
  desc: "description",
  link: "link",
  approx: "approx",
  genre: "genre",
  status: "status",
} as const satisfies Record<keyof Omit<CalendarEvent, "id">, string>;

type EventField = keyof typeof EVENT_COLUMN_MAP;
const EVENT_FIELDS = Object.keys(EVENT_COLUMN_MAP) as EventField[];
const EVENT_COLUMNS = ["id", ...Object.values(EVENT_COLUMN_MAP)].join(",");

interface EventRow {
  id: number;
  name: string;
  venue: string;
  cat: string;
  starts: string;
  ends: string;
  start_time: string | null;
  end_time: string | null;
  cost: string;
  description: string;
  link: string;
  approx: boolean;
  genre: string | null;
  status: string | null;
}

function rowToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    name: row.name,
    venue: row.venue,
    cat: row.cat as CategoryKey,
    start: row.starts,
    end: row.ends,
    startTime: row.start_time,
    endTime: row.end_time,
    cost: row.cost,
    desc: row.description,
    link: row.link,
    approx: row.approx,
    genre: row.genre as GenreKey | null,
    status: row.status as CalendarEvent["status"],
  };
}

/** Every column of a new event, ready to insert. */
function eventToRow(event: Omit<CalendarEvent, "id">): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const field of EVENT_FIELDS) row[EVENT_COLUMN_MAP[field]] = event[field];
  return row;
}

/** Only the columns a patch actually sets; `{}` when it sets nothing. */
function patchToRow(patch: EventPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const field of EVENT_FIELDS) {
    if (patch[field] !== undefined) row[EVENT_COLUMN_MAP[field]] = patch[field];
  }
  return row;
}

export async function readEvents(): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("user_id", getCurrentUserId())
    .order("starts", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<EventRow[], { merge: false }>();
  if (error) throw new Error(`Failed to read events: ${error.message}`);
  return data.map(rowToEvent);
}

export async function insertEvent(input: NewEventInput): Promise<CalendarEvent> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ user_id: getCurrentUserId(), ...eventToRow(materializeNewEvent(input)) })
    .select(EVENT_COLUMNS)
    .single()
    .overrideTypes<EventRow, { merge: false }>();
  if (error) throw new Error(`Failed to add event: ${error.message}`);
  return rowToEvent(data);
}

/** Update an event in place. Returns null when no such event exists for this user. */
export async function updateEvent(id: number, patch: EventPatch): Promise<CalendarEvent | null> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();
  const columns = patchToRow(patch);

  // Nothing to change: just return the current row (or null if it's gone).
  if (Object.keys(columns).length === 0) {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<EventRow, { merge: false }>();
    if (error) throw new Error(`Failed to load event: ${error.message}`);
    return data ? rowToEvent(data) : null;
  }

  const { data, error } = await supabase
    .from("events")
    .update(columns)
    .eq("user_id", userId)
    .eq("id", id)
    .select(EVENT_COLUMNS)
    .maybeSingle()
    .overrideTypes<EventRow, { merge: false }>();
  if (error) throw new Error(`Failed to edit event: ${error.message}`);
  return data ? rowToEvent(data) : null;
}

/** Delete an event. Returns the removed event, or null when it didn't exist. */
export async function deleteEvent(id: number): Promise<CalendarEvent | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("user_id", getCurrentUserId())
    .eq("id", id)
    .select(EVENT_COLUMNS)
    .maybeSingle()
    .overrideTypes<EventRow, { merge: false }>();
  if (error) throw new Error(`Failed to delete event: ${error.message}`);
  return data ? rowToEvent(data) : null;
}

/** Delete every event whose start date falls within [weekStart, weekEnd]. Returns how many were removed. */
export async function deleteEventsStartingInWeek(
  weekStart: IsoDate,
  weekEnd: IsoDate
): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("user_id", getCurrentUserId())
    .gte("starts", weekStart)
    .lte("starts", weekEnd)
    .select("id");
  if (error) throw new Error(`Failed to clear week events: ${error.message}`);
  return (data as { id: number }[]).length;
}

// ---- Meta (categories, weeks, shared vocabulary) ----

interface CategoryRow {
  key: string;
  label: string;
  color: string;
  groups: string[];
  position: number;
}

interface WeekRow {
  position: number;
  week_start: string;
  week_end: string;
}

interface AppSettingsRow {
  genre_labels: Record<string, string>;
  group_labels: Record<string, string>;
  group_colors: Record<string, string>;
}

/** Assembles CalendarMeta from the categories, weeks, and app_settings tables. */
export async function readMeta(): Promise<CalendarMeta> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const [categoriesRes, weeksRes, settingsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("key,label,color,groups,position")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("weeks")
      .select("position,week_start,week_end")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("app_settings")
      .select("genre_labels,group_labels,group_colors")
      .eq("user_id", userId)
      .single(),
  ]);

  if (categoriesRes.error)
    throw new Error(`Failed to read categories: ${categoriesRes.error.message}`);
  if (weeksRes.error) throw new Error(`Failed to read weeks: ${weeksRes.error.message}`);
  if (settingsRes.error)
    throw new Error(`Failed to read app settings: ${settingsRes.error.message}`);

  const cats = {} as Record<CategoryKey, CategoryMeta>;
  const catGroups = {} as Record<CategoryKey, GroupKey[]>;
  for (const row of categoriesRes.data as CategoryRow[]) {
    const key = row.key as CategoryKey;
    cats[key] = { label: row.label, color: row.color };
    catGroups[key] = row.groups as GroupKey[];
  }

  const weeks = (weeksRes.data as WeekRow[]).map(
    (w) => [w.week_start, w.week_end] as [IsoDate, IsoDate]
  );

  const settings = settingsRes.data as AppSettingsRow;

  return {
    cats,
    genreLabels: settings.genre_labels as Record<GenreKey, string>,
    catGroups,
    groupLabels: settings.group_labels as Record<GroupKey, string>,
    groupColors: settings.group_colors as Record<GroupKey, string>,
    weeks,
  };
}

// ---- Preferences (the editable Configuration page) ----

interface PreferencesRow {
  intro: string;
  sections: PreferenceSection[];
}

export async function readPreferences(): Promise<Preferences> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("preferences")
    .select("intro,sections")
    .eq("user_id", getCurrentUserId())
    .single();
  if (error) throw new Error(`Failed to read preferences: ${error.message}`);
  const row = data as PreferencesRow;
  return { intro: row.intro, sections: row.sections };
}

export async function writePreferences(prefs: Preferences): Promise<Preferences> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("preferences")
    .upsert(
      { user_id: getCurrentUserId(), intro: prefs.intro, sections: prefs.sections },
      { onConflict: "user_id" }
    )
    .select("intro,sections")
    .single();
  if (error) throw new Error(`Failed to save preferences: ${error.message}`);
  const row = data as PreferencesRow;
  return { intro: row.intro, sections: row.sections };
}
