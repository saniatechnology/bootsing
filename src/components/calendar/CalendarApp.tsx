"use client";

import Link from "next/link";
import { useState } from "react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useResearch } from "@/hooks/useResearch";
import type { ActiveRequest } from "@/hooks/useResearch";
import { useSelection } from "@/hooks/useSelection";
import { useWeekNavigation } from "@/hooks/useWeekNavigation";
import { api, errorMessage } from "@/lib/api";
import type { CalendarEvent, CalendarMeta, GroupKey } from "@/lib/types";
import { browseHorizon, latestStart } from "@/lib/weeks";
import { ChatPanel } from "../chat/ChatPanel";
import { EventForm } from "../shared/EventForm";
import type { EventFormTarget } from "../shared/EventForm";
import { StatusIndicator } from "../shared/StatusIndicator";
import { TopBar } from "../shared/TopBar";
import { WeekNav } from "../shared/WeekNav";
import { BulkActionsBar } from "./BulkActionsBar";
import { FilterBar } from "./FilterBar";
import { ResearchConfirmDialog } from "./ResearchConfirmDialog";
import { ResearchPanel } from "./ResearchPanel";
import { WeekSection } from "./WeekSection";

interface CalendarAppProps {
  initialEvents: CalendarEvent[];
  meta: CalendarMeta;
  initialWeekIndex: number;
}

/**
 * The Explore page: every event in a week grid, filterable by group, with
 * manual editing, a Claude chat that proposes changes, and a "research this
 * week" action that asks Claude to find events for weeks that have none.
 */
export function CalendarApp({ initialEvents, meta, initialWeekIndex }: CalendarAppProps) {
  const [events, setEvents] = useState(initialEvents);
  const [activeGroup, setActiveGroup] = useState<GroupKey | "all">("all");
  const [formTarget, setFormTarget] = useState<EventFormTarget | null>(null);
  const [confirmResearch, setConfirmResearch] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Global single-flight lock: only one AI request (chat or research) at a time.
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);

  const connection = useConnectionStatus();
  const { reportError, clearError } = connection;
  const selection = useSelection();
  // Let the user browse a couple of months beyond the last week that has events.
  const nav = useWeekNavigation(meta.weeks, initialWeekIndex, (thisWeekIndex) =>
    browseHorizon(meta.weeks, latestStart(events), Math.max(thisWeekIndex, meta.weeks.length - 1))
  );
  const research = useResearch({
    activeRequest,
    setActiveRequest,
    onEvents: setEvents,
    reportError,
    clearError,
  });

  const { week, weekIndex } = nav;
  const selectedEvents = events.filter((e) => selection.selectedIds.has(e.id));
  // A week "has events" when at least one event starts within it; empty weeks show the research panel.
  const weekHasEvents = week ? events.some((e) => e.start >= week[0] && e.start <= week[1]) : false;
  const researchingThisWeek =
    activeRequest?.kind === "research" && activeRequest.weekIndex === weekIndex;

  // Explore's star: unsaved -> "interesting"; already saved (any status) -> back to Explore-only.
  async function handleToggleInteresting(event: CalendarEvent) {
    try {
      setEvents(await api.updateEvent(event.id, { status: event.status ? null : "interesting" }));
      clearError();
    } catch (err) {
      reportError(errorMessage(err, "Couldn't update the event."));
    }
  }

  async function handleDelete(event: CalendarEvent) {
    if (!window.confirm(`Delete “${event.name}”? This can't be undone.`)) return;
    try {
      setEvents(await api.deleteEvent(event.id));
      selection.remove(event.id);
      clearError();
    } catch (err) {
      reportError(errorMessage(err, "Couldn't delete the event."));
    }
  }

  function startResearch() {
    if (!week) return;
    setConfirmResearch(false);
    void research.start(week, weekIndex);
  }

  // Jump to wherever the in-flight request is happening.
  function goToActiveRequest() {
    if (!activeRequest) return;
    if (activeRequest.kind === "research") nav.goTo(activeRequest.weekIndex);
    else setChatOpen(true);
  }

  return (
    <div className="wrap">
      <header className="page">
        <TopBar
          weekIndex={weekIndex}
          status={
            <StatusIndicator
              error={connection.error}
              offline={connection.offline}
              onDismiss={clearError}
            />
          }
          actions={
            activeRequest ? (
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
            )
          }
        />

        <div className="controls">
          <WeekNav nav={nav} />
          <FilterBar meta={meta} activeGroup={activeGroup} onSelectGroup={setActiveGroup} />
        </div>
      </header>

      {week && weekHasEvents && researchingThisWeek && (
        <section className="week-progress">
          <ResearchPanel lines={research.lines} onCancel={research.cancel} />
        </section>
      )}

      {week && (
        <WeekSection
          week={week}
          events={events}
          meta={meta}
          activeGroup={activeGroup}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggle}
          onSelectDay={selection.toggleAll}
          onEdit={(event) => setFormTarget({ kind: "edit", event })}
          onDelete={handleDelete}
          onToggleInteresting={handleToggleInteresting}
          onAddOnDate={(date) => setFormTarget({ kind: "new", date })}
        />
      )}

      {week && !weekHasEvents && (
        <section className="week-empty">
          {researchingThisWeek ? (
            <ResearchPanel lines={research.lines} onCancel={research.cancel} />
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
                  onClick={startResearch}
                  disabled={activeRequest !== null}
                >
                  Research events for this week
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <footer className="note">
        Click a day&rsquo;s header to add an event on that date, or edit and remove events with the
        controls on each row &mdash; or ask the chat box (bottom right), which edits this
        calendar&rsquo;s data and can search the web first when you ask it to look something up.
      </footer>

      <ChatPanel
        open={chatOpen}
        onOpenChange={setChatOpen}
        disabled={activeRequest?.kind === "research"}
        onRequestStart={() => setActiveRequest({ kind: "chat" })}
        onRequestEnd={() => setActiveRequest(null)}
        onEventsChanged={setEvents}
        selectedEvents={selectedEvents}
        onClearSelection={selection.clear}
        reportError={reportError}
        clearError={clearError}
      />

      <BulkActionsBar
        selectedEvents={selectedEvents}
        onEventsChanged={setEvents}
        onClearSelection={selection.clear}
        reportError={reportError}
        clearError={clearError}
      />

      {formTarget && (
        <EventForm
          meta={meta}
          target={formTarget}
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
        <ResearchConfirmDialog
          disabled={activeRequest !== null}
          onConfirm={startResearch}
          onClose={() => setConfirmResearch(false)}
        />
      )}
    </div>
  );
}
