import "server-only";

import type { AppliedAction, ApplyApiResponse } from "./api-types";
import { deleteEvent, insertEvent, readEvents, updateEvent } from "./store";
import type { ProposedAction } from "./validation";

/**
 * Applies the actions the user approved from a proposal. This is deterministic
 * and model-free: it replays each approved action as a row-level write against
 * the store, then re-reads the full event list to return to the client. Because
 * state may have moved on since the proposal was built, each action can fail
 * independently (e.g. its target no longer exists); those failures are reported
 * per-action rather than aborting the whole batch.
 */
export async function applyActions(actions: ProposedAction[]): Promise<ApplyApiResponse> {
  const applied: AppliedAction[] = [];

  for (const action of actions) {
    let ok = false;
    let error: string | undefined;
    try {
      switch (action.kind) {
        case "add":
          await insertEvent(action.input);
          ok = true;
          break;
        case "edit":
          ok = (await updateEvent(action.targetId, action.patch)) !== null;
          if (!ok) error = `No event with id ${action.targetId}`;
          break;
        case "delete":
          ok = (await deleteEvent(action.targetId)) !== null;
          if (!ok) error = `No event with id ${action.targetId}`;
          break;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "unknown error";
    }
    applied.push({
      actionId: action.id,
      ok,
      summary: action.summary,
      error: ok ? undefined : error,
    });
  }

  const events = await readEvents();
  return { events, applied, reply: buildReply(applied) };
}

function buildReply(applied: AppliedAction[]): string {
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
