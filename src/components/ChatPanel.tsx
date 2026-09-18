"use client";

import { useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

interface ChatPanelProps {
  onEventsChanged: (events: CalendarEvent[]) => void;
}

export function ChatPanel({ onEventsChanged }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  // The SDK's message-history shape round-trips as opaque JSON; the chat
  // component never needs to inspect it, only replay it on the next call.
  const historyRef = useRef<unknown[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setPending(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyRef.current }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "system", text: `Error: ${data.error ?? "something went wrong"}` }]);
        return;
      }

      historyRef.current = data.history;
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      if (data.changed) onEventsChanged(data.events as CalendarEvent[]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "system", text: `Error: ${err instanceof Error ? err.message : "network error"}` },
      ]);
    } finally {
      setPending(false);
      scrollToBottom();
    }
  }

  return (
    <>
      <button id="chat-toggle" aria-label="Open chat" onClick={() => setOpen((v) => !v)}>
        &#x1F4AC;
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
          </div>
          <form id="chat-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Add a free jazz concert at Marula Café on Sep 9"
              autoComplete="off"
            />
            <button type="submit" disabled={pending}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
