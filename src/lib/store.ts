import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CalendarEvent, CalendarMeta } from "./types";

/**
 * The whole persistence layer for this app: two JSON files on disk.
 * That's a deliberate, honest choice for a single-user personal tool —
 * see CONTEXT.md / README.md for what to swap in if this ever needs to
 * survive a serverless/ephemeral-filesystem host.
 *
 * Every read/write goes through this module so that's the *only* place
 * that would need to change to move to a real database later.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_PATH = path.join(DATA_DIR, "events.json");
const META_PATH = path.join(DATA_DIR, "meta.json");

export async function readEvents(): Promise<CalendarEvent[]> {
  const raw = await readFile(EVENTS_PATH, "utf8");
  return JSON.parse(raw) as CalendarEvent[];
}

export async function writeEvents(events: CalendarEvent[]): Promise<void> {
  await writeFile(EVENTS_PATH, JSON.stringify(events, null, 2) + "\n", "utf8");
}

let metaCache: CalendarMeta | null = null;

/** Category/genre/week metadata is static config, not user data — safe to cache in memory. */
export async function readMeta(): Promise<CalendarMeta> {
  if (!metaCache) {
    const raw = await readFile(META_PATH, "utf8");
    metaCache = JSON.parse(raw) as CalendarMeta;
  }
  return metaCache;
}

export function nextEventId(events: CalendarEvent[]): number {
  return events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
}
