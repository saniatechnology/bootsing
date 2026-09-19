import "server-only";

import { readEvents, readMeta, writeEvents } from "./store";
import { executeTool } from "./tools";
import type { CalendarEvent, CalendarMeta, ProposedAction } from "./types";

export interface AppliedResult {
  actionId: string;
  ok: boolean;
  summary: string;
  error?: string;
}

export interface ApplyResult {
  events: CalendarEvent[];
  applied: AppliedResult[];
  reply: string;
}

/**
 * Applies the actions the user approved from a proposal. This is deterministic
 * and model-free: it re-reads the events, replays each action through the same
 * `executeTool` mutation code the chat loop would have used, and writes once at
 * the end. Because state may have moved on since the proposal was built, each
 * action can fail independently (e.g. its target no longer exists); those
 * failures are reported per-action rather than aborting the whole batch.
 */
export async function applyActions(actions: ProposedAction[]): Promise<ApplyResult> {
  const [events, meta] = await Promise.all([readEvents(), readMeta()]);
  const applied: AppliedResult[] = [];
  let changed = false;

  for (const action of actions) {
    const result = runAction(action, events, meta);
    if (result.ok) changed = true;
    applied.push({
      actionId: action.id,
      ok: result.ok,
      summary: action.summary,
      error: result.ok ? undefined : result.error,
    });
  }

  if (changed) await writeEvents(events);
  return { events, applied, reply: buildReply(applied) };
}

function runAction(action: ProposedAction, events: CalendarEvent[], meta: CalendarMeta) {
  switch (action.kind) {
    case "add":
      return executeTool("add_event", action.input as unknown as Record<string, unknown>, events, meta);
    case "edit":
      return executeTool("edit_event", { id: action.targetId, ...action.patch }, events, meta);
    case "delete":
      return executeTool("delete_event", { id: action.targetId }, events, meta);
  }
}

function buildReply(applied: AppliedResult[]): string {
  if (applied.length === 0) return "No changes were applied.";
  const ok = applied.filter((a) => a.ok);
  const failed = applied.filter((a) => !a.ok);
  const lines: string[] = [];
  if (ok.length > 0) {
    lines.push(`Applied ${ok.length} change${ok.length === 1 ? "" : "s"}:`);
    lines.push(...ok.map((a) => `• ${a.summary}`));
  }
  if (failed.length > 0) {
    lines.push(`Couldn't apply ${failed.length}:`);
    lines.push(...failed.map((a) => `• ${a.summary} — ${a.error ?? "unknown error"}`));
  }
  return lines.join("\n");
}
