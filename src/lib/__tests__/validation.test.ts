import { describe, expect, it } from "vitest";
import {
  editEventToolInputSchema,
  eventPatchSchema,
  httpUrlOrEmpty,
  newEventInputSchema,
  proposedActionSchema,
  toolInputSchema,
} from "../validation";

const minimalEvent = {
  name: "Talk",
  venue: "Hall",
  cat: "TECH",
  start: "2026-09-08",
  end: "2026-09-08",
  cost: "Free",
  desc: "",
  link: "https://x.dev",
};

describe("httpUrlOrEmpty", () => {
  it("accepts http(s) URLs and the empty string", () => {
    expect(httpUrlOrEmpty.safeParse("https://a.b/c?d").success).toBe(true);
    expect(httpUrlOrEmpty.safeParse("http://a.b").success).toBe(true);
    expect(httpUrlOrEmpty.safeParse("").success).toBe(true);
  });

  it("rejects other schemes and relative values", () => {
    expect(httpUrlOrEmpty.safeParse("javascript:alert(1)").success).toBe(false);
    expect(httpUrlOrEmpty.safeParse("data:text/html,x").success).toBe(false);
    expect(httpUrlOrEmpty.safeParse("sala-apolo.com").success).toBe(false);
  });
});

describe("newEventInputSchema", () => {
  it("accepts a minimal event and a fully specified one", () => {
    expect(newEventInputSchema.safeParse(minimalEvent).success).toBe(true);
    expect(
      newEventInputSchema.safeParse({
        ...minimalEvent,
        cat: "MUS",
        genre: "latin",
        startTime: "21:00",
        endTime: null,
        approx: true,
      }).success
    ).toBe(true);
  });

  it("accepts an explicit null genre (the form sends this for non-music events)", () => {
    expect(newEventInputSchema.safeParse({ ...minimalEvent, genre: null }).success).toBe(true);
  });

  it("rejects malformed dates, times, keys and links", () => {
    const bad = [
      { start: "next friday" },
      { end: "2026-9-8" },
      { startTime: "9pm" },
      { cat: "SPORT" },
      { genre: "techno" },
      { link: "javascript:alert(1)" },
      { name: "" },
    ];
    for (const override of bad) {
      expect(newEventInputSchema.safeParse({ ...minimalEvent, ...override }).success).toBe(false);
    }
  });
});

describe("eventPatchSchema", () => {
  it("keeps explicit nulls for clearable fields and strips unknown keys", () => {
    const parsed = eventPatchSchema.parse({
      id: 5,
      startTime: null,
      genre: null,
      status: null,
      bogus: "ignored",
    });
    expect(parsed).toEqual({ startTime: null, genre: null, status: null });
  });

  it("accepts an empty patch", () => {
    expect(eventPatchSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an invalid value even when other fields are fine", () => {
    expect(eventPatchSchema.safeParse({ name: "ok", cat: "nope" }).success).toBe(false);
  });
});

describe("editEventToolInputSchema", () => {
  it("requires an id and never accepts status", () => {
    expect(editEventToolInputSchema.safeParse({ name: "x" }).success).toBe(false);
    expect(editEventToolInputSchema.parse({ id: 3, name: "x", status: "boots" })).toEqual({
      id: 3,
      name: "x",
    });
  });
});

describe("proposedActionSchema", () => {
  const target = { id: 3, name: "N", venue: "V", start: "2026-09-01", end: "2026-09-01" };

  it("accepts each kind of action", () => {
    expect(
      proposedActionSchema.safeParse({ id: "a", kind: "add", summary: "s", input: minimalEvent })
        .success
    ).toBe(true);
    expect(
      proposedActionSchema.safeParse({
        id: "b",
        kind: "edit",
        summary: "s",
        targetId: 3,
        patch: { cost: "€5" },
        target,
      }).success
    ).toBe(true);
    expect(
      proposedActionSchema.safeParse({ id: "c", kind: "delete", summary: "s", targetId: 3, target })
        .success
    ).toBe(true);
  });

  it("rejects an add whose input fails event validation", () => {
    const result = proposedActionSchema.safeParse({
      id: "a",
      kind: "add",
      summary: "s",
      input: { ...minimalEvent, link: "javascript:x" },
    });
    expect(result.success).toBe(false);
  });
});

describe("toolInputSchema", () => {
  // What Claude is told an event looks like. If this snapshot changes, the
  // model-facing contract changed — review the diff deliberately.
  it("renders the new-event schema Claude receives for add_event", () => {
    expect(toolInputSchema(newEventInputSchema)).toMatchInlineSnapshot(`
      {
        "additionalProperties": false,
        "properties": {
          "approx": {
            "description": "True if the date is approximate/unconfirmed",
            "type": "boolean",
          },
          "cat": {
            "description": "Category key",
            "enum": [
              "IND",
              "GAL",
              "QUEER",
              "MUS",
              "MUSPROD",
              "GAME",
              "ARCH",
              "FASH",
              "TECH",
              "NEIGH",
              "CHIC",
              "BONUS",
            ],
            "type": "string",
          },
          "cost": {
            "description": "e.g. "Free", "Paid", "€15", "Unknown"",
            "type": "string",
          },
          "desc": {
            "description": "One or two factual sentences",
            "type": "string",
          },
          "end": {
            "description": "End date, ISO yyyy-mm-dd; the same as start for a single-day event",
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
            "type": "string",
          },
          "endTime": {
            "anyOf": [
              {
                "description": "End time, 24h HH:MM; omit when unknown",
                "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$",
                "type": "string",
              },
              {
                "type": "null",
              },
            ],
          },
          "genre": {
            "anyOf": [
              {
                "description": "Only for the MUS category: music genre tag used by the dance filter",
                "enum": [
                  "latin",
                  "hiphop",
                  "pop",
                  "electronic",
                  "mixed",
                  "other",
                ],
                "type": "string",
              },
              {
                "type": "null",
              },
            ],
          },
          "link": {
            "anyOf": [
              {
                "const": "",
                "type": "string",
              },
              {
                "format": "uri",
                "type": "string",
              },
            ],
            "description": "URL for more info: the most specific source page you have",
          },
          "name": {
            "description": "Event title",
            "minLength": 1,
            "type": "string",
          },
          "start": {
            "description": "Start date, ISO yyyy-mm-dd",
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
            "type": "string",
          },
          "startTime": {
            "anyOf": [
              {
                "description": "Start time, 24h HH:MM; omit when unknown",
                "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$",
                "type": "string",
              },
              {
                "type": "null",
              },
            ],
          },
          "venue": {
            "description": "Venue or location",
            "minLength": 1,
            "type": "string",
          },
        },
        "required": [
          "name",
          "venue",
          "cat",
          "start",
          "end",
          "cost",
          "desc",
          "link",
        ],
        "type": "object",
      }
    `);
  });
});
