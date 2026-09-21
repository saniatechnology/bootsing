import { describe, expect, it } from "vitest";
import {
  ALL_TOOLS,
  CALENDAR_TOOLS,
  FIND_EVENTS_TOOL,
  MUTATING_TOOL_NAMES,
  executeTool,
} from "../tools";
import type { ToolResult } from "../tools";
import type { CalendarEvent } from "../types";
import { META, makeEvent } from "./fixtures";

function sampleEvents(): CalendarEvent[] {
  return [
    makeEvent({
      id: 1,
      name: "Jazz Night",
      venue: "Marula",
      cat: "MUS",
      genre: "mixed",
      start: "2026-09-05",
      end: "2026-09-05",
    }),
    makeEvent({
      id: 2,
      name: "Techno Rave",
      venue: "Razzmatazz",
      cat: "MUS",
      genre: "electronic",
      start: "2026-09-10",
      end: "2026-09-10",
    }),
    makeEvent({
      id: 3,
      name: "Gallery Opening",
      venue: "MACBA",
      cat: "GAL",
      genre: null,
      start: "2026-09-12",
      end: "2026-09-20",
    }),
    makeEvent({
      id: 4,
      name: "Queer Disco",
      venue: "Sala Apolo",
      cat: "QUEER",
      genre: null,
      start: "2026-09-15",
      end: "2026-09-15",
    }),
  ];
}

function findIds(input: unknown): number[] {
  const result: ToolResult = executeTool("find_events", input, sampleEvents(), META);
  if (!result.ok) throw new Error(`expected a find_events result, got: ${result.error}`);
  return result.matches.map((m) => m.id).sort((a, b) => a - b);
}

describe("executeTool: find_events", () => {
  it("matches a case-insensitive substring against name and venue", () => {
    expect(findIds({ query: "jazz" })).toEqual([1]);
    expect(findIds({ query: "RAZZ" })).toEqual([2]);
  });

  it("filters by group via catGroups", () => {
    expect(findIds({ group: "dancing" })).toEqual([1, 2, 4]);
    expect(findIds({ group: "queer" })).toEqual([4]);
  });

  it("filters by genre and category", () => {
    expect(findIds({ genre: "electronic" })).toEqual([2]);
    expect(findIds({ cat: "GAL" })).toEqual([3]);
  });

  it("filters by date-range overlap", () => {
    expect(findIds({ from: "2026-09-11", to: "2026-09-16" })).toEqual([3, 4]);
  });

  it("combines filters with AND", () => {
    expect(findIds({ group: "dancing", from: "2026-09-11" })).toEqual([4]);
  });

  it("returns everything when no filters are given", () => {
    expect(findIds({})).toEqual([1, 2, 3, 4]);
  });

  it("reports invalid filters back as a tool error instead of guessing", () => {
    const result = executeTool("find_events", { group: "sports" }, sampleEvents(), META);
    expect(result.ok).toBe(false);
  });

  it("rejects unknown tool names", () => {
    expect(executeTool("add_event", {}, sampleEvents(), META)).toEqual({
      ok: false,
      error: 'Unknown tool "add_event"',
    });
  });
});

describe("tool definitions", () => {
  it("treats exactly the add/edit/delete tools as mutating", () => {
    expect([...MUTATING_TOOL_NAMES].sort()).toEqual(["add_event", "delete_event", "edit_event"]);
    expect(ALL_TOOLS.map((t) => ("name" in t ? t.name : t.type))).toEqual([
      "web_search",
      "find_events",
      ...CALENDAR_TOOLS.map((t) => t.name),
    ]);
  });

  it("does not let the model set the user's Home status through edit_event", () => {
    const edit = CALENDAR_TOOLS.find((t) => t.name === "edit_event")!;
    const properties = edit.input_schema.properties as Record<string, unknown>;
    expect(Object.keys(properties)).not.toContain("status");
    expect(edit.input_schema.required).toEqual(["id"]);
  });

  it("emits plain JSON Schema without the $schema meta key", () => {
    for (const tool of [FIND_EVENTS_TOOL, ...CALENDAR_TOOLS]) {
      expect(tool.input_schema.type).toBe("object");
      expect(tool.input_schema).not.toHaveProperty("$schema");
    }
  });
});
