"use client";

import { useRef, useState } from "react";
import type { ErrorReporter } from "@/hooks/useConnectionStatus";
import { api, errorMessage, isAbortError } from "@/lib/api";
import { reduceProgress } from "@/lib/progress";
import type { ProgressLine } from "@/lib/progress";
import { toggleInSet } from "@/lib/selection";
import type { CalendarEvent } from "@/lib/types";
import { ProgressList } from "../shared/ProgressList";
import { ProposalReview } from "./ProposalReview";
import type { PendingProposal } from "./ProposalReview";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

interface ChatPanelProps extends ErrorReporter {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True when another AI operation is running, so this panel can't start one. */
  disabled: boolean;
  onRequestStart: () => void;
  onRequestEnd: () => void;
  onEventsChanged: (events: CalendarEvent[]) => void;
  /** Events the user has ticked; sent as context so "these" resolves without a search. */
  selectedEvents: CalendarEvent[];
  onClearSelection: () => void;
}

/**
 * The floating chat box. A message runs one assistant turn on the server; any
 * add/edit/delete the assistant wants comes back as a proposal the user
 * reviews and confirms before it is applied.
 */
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

  function scrollToBottom() {
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    });
  }

  function appendMessage(msg: ChatMessage) {
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
  }

  function reportFailure(err: unknown, fallback: string) {
    const message = errorMessage(err, fallback);
    reportError(message);
    appendMessage({ role: "system", text: `Error: ${message}` });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending || proposal || disabled) return;

    setInput("");
    appendMessage({ role: "user", text });
    setPending(true);
    setLines([{ kind: "stage", text: "Thinking…" }]);
    onRequestStart();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const done = await api.chat(
        {
          message: text,
          history: historyRef.current,
          selectedIds: selectedEvents.map((ev) => ev.id),
        },
        controller.signal,
        (event) => {
          setLines((prev) => reduceProgress(prev, event));
          scrollToBottom();
        }
      );
      clearError();
      historyRef.current = done.history;
      if (done.reply) appendMessage({ role: "assistant", text: done.reply });
      if (done.proposedActions.length > 0) {
        setProposal({
          actions: done.proposedActions,
          accepted: new Set(done.proposedActions.map((a) => a.id)),
        });
        scrollToBottom();
      } else if (!done.reply) {
        appendMessage({ role: "system", text: "No changes — nothing matched your request." });
      }
    } catch (err) {
      if (isAbortError(err)) appendMessage({ role: "system", text: "Cancelled." });
      else reportFailure(err, "The chat request failed.");
    } finally {
      setPending(false);
      setLines([]);
      onRequestEnd();
      abortRef.current = null;
    }
  }

  function toggleAccept(id: string) {
    setProposal((prev) => prev && { ...prev, accepted: toggleInSet(prev.accepted, id) });
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
      const result = await api.applyActions(actions);
      clearError();
      onEventsChanged(result.events);
      appendMessage({ role: "assistant", text: result.reply });
      onClearSelection();
    } catch (err) {
      reportFailure(err, "Couldn't apply the changes.");
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
      <button
        type="button"
        className="chat-toggle"
        aria-label="Open chat"
        onClick={() => onOpenChange(!open)}
      />

      {open && (
        <div className="chat-panel">
          <div className="chat-head">
            <span>Edit this calendar</span>
            <button type="button" aria-label="Close chat" onClick={() => onOpenChange(false)}>
              &times;
            </button>
          </div>
          <div className="chat-log" ref={logRef}>
            {messages.map((m, i) => (
              <div className={`msg ${m.role}`} key={i}>
                {m.text}
              </div>
            ))}
            {pending && (
              <div className="msg assistant streaming">
                <ProgressList lines={lines} />
              </div>
            )}
            {proposal && (
              <ProposalReview
                proposal={proposal}
                onToggle={toggleAccept}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
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

          <form className="chat-form" onSubmit={handleSubmit}>
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
              <button
                type="button"
                className="chat-cancel"
                onClick={() => abortRef.current?.abort()}
              >
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
