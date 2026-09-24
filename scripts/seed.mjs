// Seeds a Supabase project with the starter dataset in supabase/seed/:
// events, categories/weeks/settings (meta.json) and preferences, all under
// DEFAULT_USER_ID. Idempotent: this user's rows are deleted first, then
// reinserted. Run with:
//
//   npm run seed          (node --env-file=.env.local scripts/seed.mjs)
//
// The login user is seeded separately by scripts/seed-user.mjs (npm run
// seed:user). The running app never reads these files; they exist to give a
// fresh install something to look at and to document the expected shape of
// each table.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const seedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase/seed");
const readJson = (name) => JSON.parse(readFileSync(path.join(seedDir, name), "utf8"));

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEFAULT_USER_ID) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEFAULT_USER_ID (e.g. run with --env-file=.env.local)."
  );
}
const userId = DEFAULT_USER_ID;

const events = readJson("events.json");
const meta = readJson("meta.json");
const preferences = readJson("preferences.json");

// Catch a malformed seed file before touching the database.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
assert(Array.isArray(events), "events.json must be an array");
assert(
  meta.cats && meta.catGroups && Array.isArray(meta.weeks),
  "meta.json is missing cats/catGroups/weeks"
);
for (const e of events) {
  assert(typeof e.name === "string" && e.name, `event without a name: ${JSON.stringify(e)}`);
  assert(e.cat in meta.cats, `event "${e.name}" has unknown category "${e.cat}"`);
  assert(ISO_DATE.test(e.start) && ISO_DATE.test(e.end), `event "${e.name}" has non-ISO dates`);
}
assert(
  typeof preferences.intro === "string" && Array.isArray(preferences.sections),
  "preferences.json is malformed"
);

// supabase-js eagerly initializes a realtime client that needs a WebSocket
// constructor. We never use realtime here, so a no-op stub is enough on Node < 22.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class {};
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const check = (label, { error }) => {
  if (error) throw new Error(`${label}: ${error.message}`);
};

// Clear this user's rows so re-running is idempotent.
for (const table of ["events", "categories", "weeks", "app_settings", "preferences"]) {
  check(`delete ${table}`, await supabase.from(table).delete().eq("user_id", userId));
}

// Ids are left to the identity column: inserting the file's ids would not
// advance the sequence, and the app's first insert would then collide.
const eventRows = events.map((e) => ({
  user_id: userId,
  name: e.name,
  venue: e.venue,
  cat: e.cat,
  starts: e.start,
  ends: e.end,
  start_time: e.startTime ?? null,
  end_time: e.endTime ?? null,
  cost: e.cost,
  description: e.desc,
  link: e.link,
  approx: e.approx ?? false,
  genre: e.genre ?? null,
  status: e.status ?? null,
}));
check("insert events", await supabase.from("events").insert(eventRows));

const categoryRows = Object.entries(meta.cats).map(([key, v], i) => ({
  user_id: userId,
  key,
  label: v.label,
  color: v.color,
  groups: meta.catGroups[key] ?? [],
  position: i,
}));
check("insert categories", await supabase.from("categories").insert(categoryRows));

const weekRows = meta.weeks.map((w, i) => ({
  user_id: userId,
  position: i,
  week_start: w[0],
  week_end: w[1],
}));
check("insert weeks", await supabase.from("weeks").insert(weekRows));

check(
  "insert app_settings",
  await supabase.from("app_settings").insert({
    user_id: userId,
    genre_labels: meta.genreLabels,
    group_labels: meta.groupLabels,
    group_colors: meta.groupColors,
  })
);

check(
  "insert preferences",
  await supabase.from("preferences").insert({
    user_id: userId,
    intro: preferences.intro,
    sections: preferences.sections,
  })
);

console.log(
  `Seeded ${eventRows.length} events, ${categoryRows.length} categories, ${weekRows.length} weeks, app_settings and preferences for user ${userId}.`
);
