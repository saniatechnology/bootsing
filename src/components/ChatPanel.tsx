"use client";

import { useCallback, useRef, useState } from "react";
import { readProgressStream, reduceProgress } from "@/lib/progress";
import type { ProgressLine } from "@/lib/progress";
import type { CalendarEvent } from "@/lib/types";
import type { ProposedAction } from "@/lib/validation";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

interface PendingProposal {
  actions: ProposedAction[];
  /** Ids of the actions currently ticked for applying; defaults to all of them. */
  accepted: Set<string>;
}

interface ChatTurnDone {
  reply: string;
  proposedActions: ProposedAction[];
  history: unknown[];
}

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True when another AI operation is running, so this panel can't start one. */
  disabled: boolean;
  onRequestStart: () => void;
  onRequestEnd: () => void;
  onEventsChanged: (events: CalendarEvent[]) => void;
  selectedEvents: CalendarEvent[];
  onClearSelection: () => void;
  reportError: (message: string) => void;
  clearError: () => void;
}

const ACTION_LABEL: Record<ProposedAction["kind"], string> = {
  add: "Add",
  edit: "Edit",
  delete: "Delete",
};

export function ChatPanel({
  open,
  onOpenChange,
  disabled,
  onRequestStart,
  onRequestEnd,
  onEventsChanged,
  selectedEvents,
  onClearSelection,
  reportError,
  clearError,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [lines, setLines] = useState<ProgressLine[]>([]);
  const [proposal, setProposal] = useState<PendingProposal | null>(null);
  // The SDK's message-history shape round-trips as opaque JSON; the chat
  // component never needs to inspect it, only replay it on the next call.
  const historyRef = useRef<unknown[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Keep the newest progress line in view as the scrollable column fills.
  const pinProgressToBottom = useCallback(
    (el: HTMLUListElement | null) => {
      if (el) el.scrollTop = el.scrollHeight;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines.length]
  );

  function scrollToBottom() {
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    });
  }

  function appendMessage(msg: ChatMessage) {
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending || proposal || disabled) return;

    setInput("");
    appendMessage({ role: "user", text });
    setPending(true);
    setLines([{ kind: "stage", text: "Thinking\u2026" }]);
    onRequestStart();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyRef.current,
          selectedIds: selectedEvents.map((ev) => ev.id),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        appendMessage({ role: "system", text: `Error: ${data.error ?? "something went wrong"}` });
        reportError(data.error ?? "The chat request failed.");
        return;
      }

      clearError();
      let result: ChatTurnDone | null = null;
      await readProgressStream(res, (ev) => {
        if (ev.type === "stage" || ev.type === "search" || ev.type === "text") {
          setLines((prev) => reduceProgress(prev, ev));
          scrollToBottom();
        } else if (ev.type === "error") {
          appendMessage({ role: "system", text: `Error: ${ev.message}` });
          reportError(ev.message);
        } else if (ev.type === "done") {
          result = ev.data as ChatTurnDone;
        }
      });

      if (result) {
        const done = result as ChatTurnDone;
        historyRef.current = done.history;
        const actions = done.proposedActions ?? [];
        if (done.reply) appendMessage({ role: "assistant", text: done.reply });
        if (actions.length > 0) {
          setProposal({ actions, accepted: new Set(actions.map((a) => a.id)) });
          scrollToBottom();
        } else if (!done.reply) {
          appendMessage({ role: "system", text: "No changes — nothing matched your request." });
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        appendMessage({ role: "system", text: "Cancelled." });
      } else {
        reportError(err instanceof Error ? err.message : "Network error.");
        appendMessage({
          role: "system",
          text: `Error: ${err instanceof Error ? err.message : "network error"}`,
        });
      }
    } finally {
      setPending(false);
      setLines([]);
      onRequestEnd();
      abortRef.current = null;
    }
  }

  function cancelRequest() {
    abortRef.current?.abort();
  }

  function toggleAccept(id: string) {
    setProposal((prev) => {
      if (!prev) return prev;
      const accepted = new Set(prev.accepted);
      if (accepted.has(id)) accepted.delete(id);
      else accepted.add(id);
      return { ...prev, accepted };
    });
  }

  async function handleConfirm() {
    if (!proposal || pending) return;
    const actions = proposal.actions.filter((a) => proposal.accepted.has(a.id));
    if (actions.length === 0) {
      handleCancel();
      return;
    }

    setProposal(null);
    setPending(true);
    try {
      const res = await fetch("/api/chat/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      });
      const data = await res.json();

      if (!res.ok) {
        appendMessage({ role: "system", text: `Error: ${data.error ?? "something went wrong"}` });
        reportError(data.error ?? "Couldn't apply the changes.");
        return;
      }

      clearError();
      onEventsChanged(data.events as CalendarEvent[]);
      appendMessage({ role: "assistant", text: data.reply });
      onClearSelection();
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Network error.");
      appendMessage({
        role: "system",
        text: `Error: ${err instanceof Error ? err.message : "network error"}`,
      });
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    setProposal(null);
    appendMessage({ role: "system", text: "Cancelled — nothing was changed." });
  }

  return (
    <>
      <button id="chat-toggle" aria-label="Open chat" onClick={() => onOpenChange(!open)}></button>

      {open && (
        <div id="chat-panel">
          <div className="chat-head">
            <span>Edit this calendar</span>
            <button aria-label="Close chat" onClick={() => onOpenChange(false)}>
              &times;
            </button>
          </div>
          <div id="chat-log" ref={logRef}>
            {messages.map((m, i) => (
              <div className={`msg ${m.role}`} key={i}>
                {m.text}
              </div>
            ))}
            {pending && (
              <div className="msg assistant streaming">
                <ul className="progress-stack" ref={pinProgressToBottom}>
                  {lines.map((line, i) => (
                    <li key={i} className={`progress-line ${line.kind}`}>
                      {line.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {proposal && (
              <div className="proposal">
                <div className="proposal-head">Review changes</div>
                {proposal.actions.map((a) => (
                  <label className="proposal-action" key={a.id}>
                    <input
                      type="checkbox"
                      checked={proposal.accepted.has(a.id)}
                      onChange={() => toggleAccept(a.id)}
                    />
                    <span className={`proposal-kind ${a.kind}`}>{ACTION_LABEL[a.kind]}</span>
                    <span className="proposal-summary">{a.summary}</span>
                  </label>
                ))}
                <div className="proposal-actions">
                  <button type="button" className="proposal-cancel" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="proposal-confirm"
                    onClick={handleConfirm}
                    disabled={proposal.accepted.size === 0}
                  >
                    Confirm {proposal.accepted.size}
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedEvents.length > 0 && (
            <div className="selection-chip">
              <span>
                {selectedEvents.length} event{selectedEvents.length === 1 ? "" : "s"} selected
              </span>
              <button type="button" onClick={onClearSelection}>
                Clear
              </button>
            </div>
          )}

          <form id="chat-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                proposal
                  ? "Confirm or cancel the changes above"
                  : "e.g. Delete the jazz night at Marula"
              }
              autoComplete="off"
              disabled={proposal !== null || disabled}
            />
            {pending ? (
              <button type="button" className="chat-cancel" onClick={cancelRequest}>
                Cancel
              </button>
            ) : (
              <button type="submit" disabled={proposal !== null || disabled}>
                Send
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
