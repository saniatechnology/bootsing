"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatPanel } from "./ChatPanel";
import { BulkActionsBar } from "./BulkActionsBar";
import { EventForm } from "./EventForm";
import { FilterBar } from "./FilterBar";
import { WeekSection } from "./WeekSection";
import { StatusIndicator } from "./StatusIndicator";
import { useOffline } from "@/lib/useOffline";
import { toIsoDate, addDays, parseIsoDate, daysBetween } from "@/lib/dates";
import { weekIndexForDate } from "@/lib/grid";
import { readProgressStream, reduceProgress } from "@/lib/progress";
import type { ProgressLine } from "@/lib/progress";
import type { CalendarEvent, CalendarMeta, GroupKey, IsoDate } from "@/lib/types";

/** The AI operation currently running, if any; only one may run at a time. */
type ActiveRequest = { kind: "research"; weekIndex: number } | { kind: "chat" } | null;

interface CalendarAppProps {
  initialEvents: CalendarEvent[];
  meta: CalendarMeta;
  initialWeekIndex: number;
}

/**
 * The week at a given index. Indexes within the configured list return that
 * week; indexes past the end return successive empty 7-day windows, so the user
 * can navigate forward into future weeks and research them.
 */
function weekForIndex(
  weeks: [IsoDate, IsoDate][],
  index: number
): [IsoDate, IsoDate] | undefined {
  if (weeks.length === 0) return undefined;
  if (index < weeks.length) return weeks[index];
  const lastEnd = parseIsoDate(weeks[weeks.length - 1][1]);
  const offset = index - (weeks.length - 1); // 1 = first synthetic week
  const start = addDays(lastEnd, 1 + (offset - 1) * 7);
  return [toIsoDate(start), toIsoDate(addDays(start, 6))];
}

/** Week index containing `iso`, extending past the configured list into synthetic future weeks. */
function indexForDate(weeks: [IsoDate, IsoDate][], iso: IsoDate): number {
  if (weeks.length === 0) return 0;
  const t = parseIsoDate(iso).getTime();
  for (let i = 0; i < weeks.length; i++) {
    if (t >= parseIsoDate(weeks[i][0]).getTime() && t <= parseIsoDate(weeks[i][1]).getTime()) return i;
  }
  if (t < parseIsoDate(weeks[0][0]).getTime()) return 0;
  const lastEnd = parseIsoDate(weeks[weeks.length - 1][1]);
  const days = daysBetween(lastEnd, parseIsoDate(iso));
  return days <= 0 ? weeks.length - 1 : weeks.length - 1 + Math.ceil(days / 7);
}

export function CalendarApp({ initialEvents, meta, initialWeekIndex }: CalendarAppProps) {
  const [events, setEvents] = useState(initialEvents);
  const [activeGroup, setActiveGroup] = useState<GroupKey | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const thisWeekIndex = weekIndexForDate(meta.weeks, toIsoDate(new Date()));
  const [weekIndex, setWeekIndex] = useState(initialWeekIndex);

  const week = weekForIndex(meta.weeks, weekIndex);

  // Let the user browse up to ~2 months (8 weeks) beyond the last week that has events.
  const lastEventIso =
    events.length > 0 ? events.reduce((max, e) => (e.start > max ? e.start : max), events[0].start) : null;
  const lastEventIndex = lastEventIso
    ? indexForDate(meta.weeks, lastEventIso)
    : Math.max(thisWeekIndex, meta.weeks.length - 1);
  const maxWeekIndex = Math.max(meta.weeks.length - 1, lastEventIndex + 8);

  // null = form closed; { newOn } = adding on that date; a CalendarEvent = editing it.
  const [formTarget, setFormTarget] = useState<CalendarEvent | { newOn: string } | null>(null);
  const addingOn = formTarget !== null && "newOn" in formTarget ? formTarget.newOn : null;

  const [connError, setConnError] = useState<string | null>(null);
  const offline = useOffline();
  const reportError = (message: string) => setConnError(message);
  const clearError = () => setConnError(null);

  const [researching, setResearching] = useState(false);
  const [confirmResearch, setConfirmResearch] = useState(false);

  // Global single-flight lock: which AI op is running and where, plus its live progress.
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [researchLines, setResearchLines] = useState<ProgressLine[]>([]);
  const researchAbortRef = useRef<AbortController | null>(null);

  // Keep the newest progress line in view as the scrollable column fills.
  const pinProgressToBottom = useCallback(
    (el: HTMLUListElement | null) => {
      if (el) el.scrollTop = el.scrollHeight;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [researchLines.length]
  );

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelected() {
    setSelectedIds(new Set());
  }

  // Toggle a day's events as a group: select all if any are unselected, else clear them.
  function selectDay(ids: number[]) {
    if (ids.length === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  const selectedEvents = events.filter((e) => selectedIds.has(e.id));

  // Explore's star: unsaved -> "interesting"; already saved (any status) -> back to Explore-only.
  async function handleToggleInteresting(event: CalendarEvent) {
    const next = event.status ? null : "interesting";
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        reportError(data.error ?? "Couldn't update the event.");
        return;
      }
      clearError();
      setEvents(data.events as CalendarEvent[]);
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Network error.");
    }
  }

  async function handleDelete(event: CalendarEvent) {
    if (!window.confirm(`Delete “${event.name}”? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        reportError(data.error ?? "Couldn't delete the event.");
        return;
      }
      clearError();
      setEvents(data.events as CalendarEvent[]);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Network error.");
    }
  }

  // A week "has events" when at least one event starts within it; empty weeks show the research panel.
  const weekHasEvents = week ? events.some((e) => e.start >= week[0] && e.start <= week[1]) : false;

  async function handleResearch() {
    if (activeRequest || !week) return;
    const controller = new AbortController();
    researchAbortRef.current = controller;
    setActiveRequest({ kind: "research", weekIndex });
    setResearching(true);
    setResearchLines([{ kind: "stage", text: "Starting\u2026" }]);
    setConfirmResearch(false);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: week[0], weekEnd: week[1] }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        reportError(data.error ?? "Couldn't research this week.");
        return;
      }
      clearError();
      await readProgressStream(res, (ev) => {
        if (ev.type === "stage" || ev.type === "search" || ev.type === "text") {
          setResearchLines((prev) => reduceProgress(prev, ev));
        } else if (ev.type === "error") reportError(ev.message);
        else if (ev.type === "done") setEvents((ev.data as { events: CalendarEvent[] }).events);
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        reportError(err instanceof Error ? err.message : "Network error.");
      }
    } finally {
      setResearching(false);
      setActiveRequest(null);
      setResearchLines([]);
      researchAbortRef.current = null;
    }
  }

  function cancelResearch() {
    researchAbortRef.current?.abort();
  }

  // Jump to wherever the in-flight request is happening.
  function goToActiveRequest() {
    if (!activeRequest) return;
    if (activeRequest.kind === "research") setWeekIndex(activeRequest.weekIndex);
    else setChatOpen(true);
  }

  const researchingThisWeek =
    activeRequest?.kind === "research" && activeRequest.weekIndex === weekIndex;

  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <div className="topbar-title">
            <h1>
              <Link href={`/?w=${weekIndex}`} className="title-link">
                Bootsing
              </Link>
            </h1>
            <Link href="/explore" className="area-link">
              Explore
            </Link>
          </div>
          <div className="topbar-actions">
            <StatusIndicator error={connError} offline={offline} onDismiss={clearError} />
            {activeRequest ? (
              <button
                type="button"
                className="busy-indicator"
                aria-label="A request is in progress — go to it"
                title="A request is in progress — go to it"
                onClick={goToActiveRequest}
              />
            ) : (
              weekHasEvents && (
                <button
                  type="button"
                  className="research-btn"
                  aria-label="Research this week's events"
                  title="Research this week's events"
                  onClick={() => setConfirmResearch(true)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    autorenew
                  </span>
                </button>
              )
            )}
            <Link href="/configuration" className="settings-btn" aria-label="Open configuration" title="Configuration">
              <span className="material-symbols-outlined" aria-hidden="true">
                settings
              </span>
            </Link>
          </div>
        </div>

        <div className="controls">
          <div className="week-nav">
            <button type="button" className="nav-btn nav-today" onClick={() => setWeekIndex(thisWeekIndex)}>
              This week
            </button>
            <button type="button" className="nav-btn" onClick={() => setWeekIndex((i) => Math.max(0, i - 1))} disabled={weekIndex === 0} aria-label="Previous week">
              &lsaquo;
            </button>
            <button
              type="button"
              className="nav-btn"
              onClick={() => setWeekIndex((i) => Math.min(maxWeekIndex, i + 1))}
              disabled={weekIndex >= maxWeekIndex}
              aria-label="Next week"
            >
              &rsaquo;
            </button>
          </div>

          <FilterBar meta={meta} activeGroup={activeGroup} onSelectGroup={setActiveGroup} />
        </div>
      </header>

      {week && weekHasEvents && researchingThisWeek && (
        <section className="week-progress">
          <div className="research-progress">
            <ul className="progress-stack" ref={pinProgressToBottom}>
              {researchLines.map((line, i) => (
                <li key={i} className={`progress-line ${line.kind}`}>
                  {line.text}
                </li>
              ))}
            </ul>
            <div className="week-empty-actions">
              <button type="button" className="nav-btn" onClick={cancelResearch}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {week && (
        <WeekSection
          week={week}
          events={events}
          meta={meta}
          activeGroup={activeGroup}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onSelectDay={selectDay}
          onEdit={(event) => setFormTarget(event)}
          onDelete={handleDelete}
          onToggleInteresting={handleToggleInteresting}
          onAddOnDate={(date) => setFormTarget({ newOn: date })}
        />
      )}

      {week && !weekHasEvents && (
        <section className="week-empty">
          {researchingThisWeek ? (
            <div className="research-progress">
              <ul className="progress-stack" ref={pinProgressToBottom}>
                {researchLines.map((line, i) => (
                  <li key={i} className={`progress-line ${line.kind}`}>
                    {line.text}
                  </li>
                ))}
              </ul>
              <div className="week-empty-actions">
                <button type="button" className="nav-btn" onClick={cancelResearch}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="week-empty-title">No events for this week yet.</p>
              <p className="week-empty-note">
                {`Research Barcelona events for ${week[0]} to ${week[1]} from your preferences, or edit what you're looking for first.`}
              </p>
              <div className="week-empty-actions">
                <Link href="/configuration" className="nav-btn">
                  Edit configuration
                </Link>
                <button
                  type="button"
                  className="nav-btn nav-primary"
                  onClick={() => handleResearch()}
                  disabled={activeRequest !== null}
                >
                  Research events for this week
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <footer className="note">Click a day&rsquo;s header to add an event on that date, or edit and remove events with the controls on each row &mdash; or ask the chat box (bottom right), which edits this calendar&rsquo;s data and can search the web first when you ask it to look something up.</footer>

      <ChatPanel
        open={chatOpen}
        onOpenChange={setChatOpen}
        disabled={activeRequest?.kind === "research"}
        onRequestStart={() => setActiveRequest({ kind: "chat" })}
        onRequestEnd={() => setActiveRequest(null)}
        onEventsChanged={setEvents}
        selectedEvents={selectedEvents}
        onClearSelection={clearSelected}
        reportError={reportError}
        clearError={clearError}
      />

      <BulkActionsBar
        selectedEvents={selectedEvents}
        onEventsChanged={setEvents}
        onClearSelection={clearSelected}
        reportError={reportError}
        clearError={clearError}
      />

      {formTarget !== null && (
        <EventForm
          meta={meta}
          event={addingOn !== null ? null : (formTarget as CalendarEvent)}
          defaultDate={addingOn ?? (week ? week[0] : toIsoDate(new Date()))}
          onSaved={(next) => {
            setEvents(next);
            setFormTarget(null);
          }}
          onCancel={() => setFormTarget(null)}
          reportError={reportError}
          clearError={clearError}
        />
      )}

      {confirmResearch && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Research this week"
          onClick={() => !researching && setConfirmResearch(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>Research this week?</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => !researching && setConfirmResearch(false)}
              >
                &times;
              </button>
            </div>
            <div className="status-modal-body">
              <p className="status-modal-message">
                A fresh research run will replace this week&rsquo;s events with the newly gathered
                results. Some events currently shown may not appear again.
              </p>
              <div className="research-modal-actions">
                <button
                  type="button"
                  className="rm-cancel"
                  onClick={() => setConfirmResearch(false)}
                  disabled={researching}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rm-confirm"
                  onClick={() => handleResearch()}
                  disabled={researching}
                >
                  {researching ? "Researching\u2026" : "Research"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Full-page fallback when the initial server-side data load fails. */
export function LoadErrorScreen({ message }: { message: string }) {
  const router = useRouter();
  const offline = useOffline();
  const [error, setError] = useState<string | null>(message);
  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <h1>Bootsing</h1>
          <div className="topbar-actions">
            <StatusIndicator error={error} offline={offline} onDismiss={() => setError(null)} />
            <Link href="/configuration" className="settings-btn" aria-label="Open configuration" title="Configuration">
              <span className="material-symbols-outlined" aria-hidden="true">
                settings
              </span>
            </Link>
          </div>
        </div>
      </header>
      <div className="load-error">
        <p className="load-error-title">We couldn&rsquo;t load your calendar.</p>
        <p className="load-error-note">Open the status icon above for details, then try again.</p>
        <button type="button" className="nav-btn" onClick={() => router.refresh()}>
          Try again
        </button>
      </div>
    </div>
  );
}
