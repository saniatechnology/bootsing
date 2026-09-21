import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "./env";
import type { ProgressEmit } from "./progress";

/**
 * Everything that talks to the Anthropic SDK directly: the lazily-built
 * client, prompt-caching helpers, the streamed turn runner that turns SDK
 * events into UI progress, and small content-block accessors. Nothing here
 * knows about calendars; the chat and research loops layer that on top.
 */

let client: Anthropic | null = null;

/** Lazily constructed so a missing key surfaces as a clear error on first use, not at import time. */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = requireEnv(
      "ANTHROPIC_API_KEY",
      "Copy .env.example to .env.local and add your key from https://console.anthropic.com/settings/keys"
    );
    client = new Anthropic({ apiKey });
  }
  return client;
}

/** The model used for every Claude call. Override with `ANTHROPIC_MODEL` to try another. */
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

/**
 * Put a cache breakpoint on the last tool so the whole tool block is served
 * from cache on the agent loop's repeat calls (tools are identical each turn).
 */
export function cachedTools(tools: Anthropic.Messages.ToolUnion[]): Anthropic.Messages.ToolUnion[] {
  if (tools.length === 0) return tools;
  const last = {
    ...tools[tools.length - 1],
    cache_control: { type: "ephemeral" as const },
  } as Anthropic.Messages.ToolUnion;
  return [...tools.slice(0, -1), last];
}

/** Wrap a system prompt string as a single cached block, read from cache on repeat loop calls. */
export function cachedSystem(text: string): Anthropic.Messages.TextBlockParam[] {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}

/** The server-side web search tool, executed and resolved by the Anthropic API itself. */
export function webSearchTool(options: {
  /** Cap on searches per request; each one is billed. */
  maxUses: number;
  /** Restrict how the model may invoke it, e.g. `["direct"]` for sequential searches only. */
  allowedCallers?: Anthropic.Messages.WebSearchTool20260318["allowed_callers"];
}): Anthropic.Messages.WebSearchTool20260318 {
  return {
    type: "web_search_20260318",
    name: "web_search",
    max_uses: options.maxUses,
    ...(options.allowedCallers ? { allowed_callers: options.allowedCallers } : {}),
  };
}

export function textBlocksOf(
  content: readonly Anthropic.Messages.ContentBlock[]
): Anthropic.Messages.TextBlock[] {
  return content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text");
}

/** All of a response's text, joined; empty when it contained none. */
export function textOf(content: readonly Anthropic.Messages.ContentBlock[]): string {
  return textBlocksOf(content)
    .map((b) => b.text)
    .join("\n");
}

export function toolUsesOf(
  content: readonly Anthropic.Messages.ContentBlock[]
): Anthropic.Messages.ToolUseBlock[] {
  return content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");
}

/** Pull the query strings out of web_search({"query": "..."}) calls in executed code. */
export function extractSearchQueries(code: string): string[] {
  const queries: string[] = [];
  const re = /"query"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    try {
      queries.push(JSON.parse(`"${m[1]}"`) as string);
    } catch {
      queries.push(m[1]);
    }
  }
  return queries;
}

export interface StreamTurnOptions {
  emit?: ProgressEmit;
  /**
   * Progress labels to emit when the model starts calling one of the caller's
   * own tools, keyed by tool name — e.g. `{ find_events: "Looking through the calendar…" }`.
   */
  stageLabels?: Readonly<Record<string, string>>;
}

/**
 * Runs one streamed model turn, forwarding progress to `emit` as it arrives:
 * assistant text deltas, each server-side search query, the sources each
 * search returned, and a stage label when a caller tool starts. The model
 * drives web_search from a code_execution sandbox, so queries are extracted
 * from the executed code rather than the (empty) web_search blocks. Returns
 * the assembled final message so the caller's agent loop can inspect content
 * and stop_reason.
 */
export async function streamTurn(
  params: Parameters<Anthropic["messages"]["stream"]>[0],
  { emit, stageLabels = {} }: StreamTurnOptions = {}
): Promise<Anthropic.Messages.Message> {
  const stream = getAnthropicClient().messages.stream(params);
  let toolName: string | null = null;
  let toolJson = "";
  let lastQuery = "";
  const seenUrls = new Set<string>();

  const emitSearch = (query: string) => {
    if (!query || query === lastQuery) return;
    lastQuery = query;
    emit?.({ type: "search", query });
  };

  for await (const ev of stream) {
    if (ev.type === "content_block_start") {
      const block = ev.content_block;
      toolName = null;
      toolJson = "";
      if (block.type === "server_tool_use" && block.name === "web_search") {
        toolName = "web_search";
      } else if (block.type === "server_tool_use" && block.name === "code_execution") {
        toolName = "code_execution";
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        // Server-side results arrive complete here; surface each source once.
        for (const r of block.content) {
          if (r.type !== "web_search_result" || seenUrls.has(r.url)) continue;
          seenUrls.add(r.url);
          emit?.({ type: "result", title: r.title, url: r.url });
        }
      } else if (block.type === "tool_use" && stageLabels[block.name]) {
        emit?.({ type: "stage", label: stageLabels[block.name] });
      }
    } else if (ev.type === "content_block_delta") {
      if (ev.delta.type === "text_delta") emit?.({ type: "text", delta: ev.delta.text });
      else if (ev.delta.type === "thinking_delta")
        emit?.({ type: "text", delta: ev.delta.thinking });
      else if (ev.delta.type === "input_json_delta" && toolName) toolJson += ev.delta.partial_json;
    } else if (ev.type === "content_block_stop" && toolName) {
      const name = toolName;
      const json = toolJson;
      toolName = null;
      toolJson = "";
      try {
        const input = JSON.parse(json || "{}") as { query?: unknown; code?: unknown };
        if (name === "web_search" && typeof input.query === "string") {
          emitSearch(input.query);
        } else if (name === "code_execution" && typeof input.code === "string") {
          for (const q of extractSearchQueries(input.code)) emitSearch(q);
        }
      } catch {
        /* partial/invalid tool input — nothing to surface */
      }
    }
  }

  return stream.finalMessage();
}
