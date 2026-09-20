import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { ProgressEmit } from "./progress";

let client: Anthropic | null = null;

/** Lazily constructed so a missing key surfaces as a clear error on first use, not at import time. */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key " +
          "from https://console.anthropic.com/settings/keys"
      );
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const CHAT_MODEL = "claude-sonnet-5";

/**
 * Put a cache breakpoint on the last tool so the whole tool block is served
 * from cache on the agent loop's repeat calls (tools are identical each turn).
 */
export function cachedTools(
  tools: Anthropic.Messages.ToolUnion[]
): Anthropic.Messages.ToolUnion[] {
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

/** Pull the query strings out of web_search({"query": "..."}) calls in executed code. */
function extractSearchQueries(code: string): string[] {
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

/**
 * Runs one streamed model turn, forwarding progress to `emit` as it arrives:
 * assistant text deltas, each server-side search query, and the sources each
 * search returned. claude-sonnet-5 drives web_search from a code_execution
 * sandbox, so queries are extracted from the executed code rather than the
 * (empty) web_search blocks. Returns the assembled final message so the
 * caller's agent loop can inspect content and stop_reason as before.
 */
export async function streamTurn(
  params: Parameters<Anthropic["messages"]["stream"]>[0],
  emit?: ProgressEmit
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
      } else if (block.type === "tool_use" && block.name === "find_events") {
        emit?.({ type: "stage", label: "Looking through the calendar\u2026" });
      } else if (block.type === "tool_use" && block.name === "submit_week_events") {
        emit?.({ type: "stage", label: "Saving events\u2026" });
      }
    } else if (ev.type === "content_block_delta") {
      if (ev.delta.type === "text_delta") emit?.({ type: "text", delta: ev.delta.text });
      else if (ev.delta.type === "thinking_delta") emit?.({ type: "text", delta: ev.delta.thinking });
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
          const queries = extractSearchQueries(input.code);
          if (queries.length > 0) {
            for (const q of queries) emitSearch(q);

          }
        }
      } catch {
        /* partial/invalid tool input — nothing to surface */
      }
    }
  }

  return stream.finalMessage();
}
