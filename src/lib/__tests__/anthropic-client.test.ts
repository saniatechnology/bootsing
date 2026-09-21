import { describe, expect, it } from "vitest";
import {
  cachedTools,
  extractSearchQueries,
  textOf,
  toolUsesOf,
  webSearchTool,
} from "../anthropic-client";
import type Anthropic from "@anthropic-ai/sdk";

describe("extractSearchQueries", () => {
  it("pulls every query out of web_search calls in executed code, unescaping JSON", () => {
    const code = [
      'r1 = web_search({"query": "jazz barcelona"})',
      'r2 = web_search({ "query" : "Sala \\"Apolo\\" schedule" })',
    ].join("\n");
    expect(extractSearchQueries(code)).toEqual(["jazz barcelona", 'Sala "Apolo" schedule']);
  });

  it("returns an empty list when there are no searches", () => {
    expect(extractSearchQueries("print('hi')")).toEqual([]);
  });
});

describe("content helpers", () => {
  const content: Anthropic.Messages.ContentBlock[] = [
    { type: "text", text: "Hello", citations: null },
    {
      type: "tool_use",
      id: "tu_1",
      name: "find_events",
      input: { query: "jazz" },
      caller: { type: "direct" },
    },
    { type: "text", text: "world", citations: null },
  ];

  it("joins text blocks and picks out tool uses", () => {
    expect(textOf(content)).toBe("Hello\nworld");
    expect(toolUsesOf(content).map((t) => t.name)).toEqual(["find_events"]);
    expect(textOf([])).toBe("");
  });
});

describe("cachedTools / webSearchTool", () => {
  it("marks only the last tool as a cache breakpoint and leaves the input untouched", () => {
    const tools: Anthropic.Messages.ToolUnion[] = [
      webSearchTool({ maxUses: 3 }),
      { name: "t", description: "d", input_schema: { type: "object" } },
    ];
    const cached = cachedTools(tools);
    expect(cached[0]).not.toHaveProperty("cache_control");
    expect(cached[1]).toMatchObject({ cache_control: { type: "ephemeral" } });
    expect(tools[1]).not.toHaveProperty("cache_control");
    expect(cachedTools([])).toEqual([]);
  });

  it("only sets allowed_callers when asked", () => {
    expect(webSearchTool({ maxUses: 5, allowedCallers: ["direct"] })).toEqual({
      type: "web_search_20260318",
      name: "web_search",
      max_uses: 5,
      allowed_callers: ["direct"],
    });
    expect(webSearchTool({ maxUses: 3 })).not.toHaveProperty("allowed_callers");
  });
});
