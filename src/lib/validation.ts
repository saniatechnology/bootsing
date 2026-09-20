import { z } from "zod";
import { CATEGORY_KEYS, GENRE_KEYS } from "./types";

/** Shared Zod schemas for validating event payloads at API boundaries. */

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be ISO yyyy-mm-dd");
export const category = z.enum(CATEGORY_KEYS);
export const genre = z.enum(GENRE_KEYS);

/** A brand-new event; `id` is assigned by the store, `approx`/`genre` are optional. */
export const newEventInputSchema = z.object({
  name: z.string().min(1),
  venue: z.string().min(1),
  cat: category,
  start: isoDate,
  end: isoDate,
  cost: z.string(),
  desc: z.string(),
  link: z.string(),
  approx: z.boolean().optional(),
  genre: genre.optional(),
});

/** A partial change to an existing event; every field is optional. */
export const eventPatchSchema = z.object({
  name: z.string().min(1).optional(),
  venue: z.string().min(1).optional(),
  cat: category.optional(),
  start: isoDate.optional(),
  end: isoDate.optional(),
  cost: z.string().optional(),
  desc: z.string().optional(),
  link: z.string().optional(),
  approx: z.boolean().optional(),
  genre: genre.nullable().optional(),
});

/** The editable Configuration-page preferences. */
const preferenceItem = z.object({
  label: z.string().min(1, "each item needs a label"),
  detail: z.string().optional(),
});

const preferenceSection = z.object({
  title: z.string().min(1, "each section needs a title"),
  note: z.string().optional(),
  items: z.array(preferenceItem),
  emptyText: z.string().optional(),
});

export const preferencesSchema = z.object({
  intro: z.string(),
  sections: z.array(preferenceSection),
});
