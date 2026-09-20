"use client";

import { useRef, useState } from "react";
import type { CalendarEvent, ProposedAction } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

interface PendingProposal {
  actions: ProposedAction[];
  /** Ids of the actions currently ticked for applying; defaults to all of them. */
  accepted: Set<string>;
}

interface ChatPanelProps {
  onEventsChanged: (events: CalendarEvent[]) => void;
  selectedEvents: CalendarEvent[];
  onClearSelection: () => void;
}

const ACTION_LABEL: Record<ProposedAction["kind"], string> = {
  add: "Add",
  edit: "Edit",
  delete: "Delete",
};

export function ChatPanel({ onEventsChanged, selectedEvents, onClearSelection }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [proposal, setProposal] = useState<PendingProposal | null>(null);
  // The SDK's message-history shape round-trips as opaque JSON; the chat
  // component never needs to inspect it, only replay it on the next call.
  const historyRef = useRef<unknown[]>([]);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending || proposal) return;

    setInput("");
    appendMessage({ role: "user", text });
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyRef.current,
          selectedIds: selectedEvents.map((ev) => ev.id),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        appendMessage({ role: "system", text: `Error: ${data.error ?? "something went wrong"}` });
        return;
      }

      historyRef.current = data.history;
      const actions = (data.proposedActions ?? []) as ProposedAction[];
      if (data.reply) appendMessage({ role: "assistant", text: data.reply });

      if (actions.length > 0) {
        setProposal({ actions, accepted: new Set(actions.map((a) => a.id)) });
        scrollToBottom();
      } else if (!data.reply) {
        appendMessage({ role: "system", text: "No changes — nothing matched your request." });
      }
    } catch (err) {
      appendMessage({
        role: "system",
        text: `Error: ${err instanceof Error ? err.message : "network error"}`,
      });
    } finally {
      setPending(false);
    }
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
        return;
      }

      onEventsChanged(data.events as CalendarEvent[]);
      appendMessage({ role: "assistant", text: data.reply });
      onClearSelection();
    } catch (err) {
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
      <button id="chat-toggle" aria-label="Open chat" onClick={() => setOpen((v) => !v)}>
      </button>

      {open && (
        <div id="chat-panel">
          <div className="chat-head">
            <span>Edit this calendar</span>
            <button aria-label="Close chat" onClick={() => setOpen(false)}>
              &times;
            </button>
          </div>
          <div id="chat-log" ref={logRef}>
            {messages.map((m, i) => (
              <div className={`msg ${m.role}`} key={i}>
                {m.text}
              </div>
            ))}
            {pending && <div className="msg system">Thinking&#8230;</div>}

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
                proposal ? "Confirm or cancel the changes above" : "e.g. Delete the jazz night at Marula"
              }
              autoComplete="off"
              disabled={proposal !== null}
            />
            <button type="submit" disabled={pending || proposal !== null}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
