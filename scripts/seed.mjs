// Seeds the current DEFAULT_USER_ID from data/events.json + data/meta.json.
// Idempotent: clears this user's rows first, then reinserts. Run with:
//   node --env-file=.env.local scripts/seed.mjs
// Preferences are embedded here (from src/lib/preferences.ts) since that module
// becomes DB-backed later.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_USER_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEFAULT_USER_ID) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEFAULT_USER_ID (e.g. run with --env-file=.env.local)."
  );
}
const userId = DEFAULT_USER_ID;

const events = JSON.parse(readFileSync(path.join(root, "data/events.json"), "utf8"));
const meta = JSON.parse(readFileSync(path.join(root, "data/meta.json"), "utf8"));

const PREFERENCES_INTRO =
  "These are the preferences the current events were gathered against — what I said I want to see, " +
  "what to skip, and the music I like for dancing. They're read-only for now; editing comes later.";

const PREFERENCE_SECTIONS = [
  {
    title: "Event types I'm interested in",
    note: "In rough priority order — what I most want to discover first.",
    items: [
      { label: "Independent / artist-run spaces" },
      { label: "Contemporary art & galleries", detail: "Including openings and closings." },
      { label: "Queer events" },
      {
        label: "Music — pop / electronic, small-scale",
        detail: "Discovery-oriented club nights and small-room shows, not big-room mainstream acts.",
      },
      { label: "Music production", detail: "Meetups, workshops, gear / modular-synth culture." },
      { label: "Games / anime / nerd culture" },
      {
        label: "Barcelona World Capital of Architecture 2026",
        detail: "Including the guided-tour (\u201CRutas\u201D) program.",
      },
      { label: "Fashion" },
      { label: "Tech & software" },
      { label: "Neighborhood festivals", detail: "Festes majors, La Merc\u00E8, etc." },
      {
        label: "\u201CChic but interesting\u201D standout events",
        detail: "Polished picks that are still a genuine choice, not tourist spectacle.",
      },
    ],
  },
  {
    title: "Music styles I like for dancing",
    items: [
      { label: "Latin", detail: "Primary interest." },
      { label: "Hip-Hop", detail: "Primary interest." },
      { label: "Pop", detail: "Primary interest." },
      { label: "Electronic / EDM", detail: "Secondary interest — wanted in the data but lower priority." },
    ],
  },
  {
    title: "Favorite venues, festivals & events",
    note: "Places and events I want to prioritize.",
    emptyText: "None saved yet — this will fill in as I mark favorites.",
    items: [],
  },
  {
    title: "What to skip",
    note: "General bias: favor independent, emerging, and discovery-oriented events. When two options are similar, the smaller / less-obvious one wins.",
    items: [
      { label: "Mainstream / tourist-oriented events" },
      { label: "Big-room mainstream music acts" },
      { label: "Default \u201Cbig show\u201D tourist spectacle", detail: "Unless it's a genuine, deliberate pick." },
    ],
  },
];

// supabase-js eagerly initializes a realtime client that needs a WebSocket
// constructor. We never use realtime here, so a no-op stub is enough on Node 20.
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

const eventRows = events.map((e) => ({
  id: e.id,
  user_id: userId,
  name: e.name,
  venue: e.venue,
  cat: e.cat,
  starts: e.start,
  ends: e.end,
  cost: e.cost,
  description: e.desc,
  link: e.link,
  approx: e.approx,
  genre: e.genre,
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
    intro: PREFERENCES_INTRO,
    sections: PREFERENCE_SECTIONS,
  })
);

console.log(
  `Seeded ${eventRows.length} events, ${categoryRows.length} categories, ${weekRows.length} weeks, app_settings + preferences for user ${userId}.`
);
console.log("Note: reset the events id sequence after seeding explicit ids (see migration/README).");
