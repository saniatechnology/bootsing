/**
 * The event-gathering preferences Sania originally researched this calendar
 * against, surfaced read-only on the Configuration page. Sourced from
 * CONTEXT.md ("What counts as interesting" + the genre notes). These are
 * reference-only for now; a future version will make them editable.
 */

export interface PreferenceItem {
  label: string;
  detail?: string;
}

export interface PreferenceSection {
  title: string;
  note?: string;
  items: PreferenceItem[];
  /** Shown when `items` is empty, e.g. "None yet." */
  emptyText?: string;
}

export const PREFERENCES_INTRO =
  "These are the preferences the current events were gathered against — what I said I want to see, " +
  "what to skip, and the music I like for dancing. They're read-only for now; editing comes later.";

export const PREFERENCE_SECTIONS: PreferenceSection[] = [
  {
    title: "Event types I'm interested in",
    note: "In rough priority order — what I most want to discover first.",
    items: [
      { label: "Independent / artist-run spaces" },
      {
        label: "Contemporary art & galleries",
        detail: "Including openings and closings.",
      },
      { label: "Queer events" },
      {
        label: "Music — pop / electronic, small-scale",
        detail: "Discovery-oriented club nights and small-room shows, not big-room mainstream acts.",
      },
      {
        label: "Music production",
        detail: "Meetups, workshops, gear / modular-synth culture.",
      },
      { label: "Games / anime / nerd culture" },
      {
        label: "Barcelona World Capital of Architecture 2026",
        detail: "Including the guided-tour (\u201CRutas\u201D) program.",
      },
      { label: "Fashion" },
      { label: "Tech & software" },
      {
        label: "Neighborhood festivals",
        detail: "Festes majors, La Merc\u00E8, etc.",
      },
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
      {
        label: "Electronic / EDM",
        detail: "Secondary interest — wanted in the data but lower priority.",
      },
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
      {
        label: "Default \u201Cbig show\u201D tourist spectacle",
        detail: "Unless it's a genuine, deliberate pick.",
      },
    ],
  },
];
