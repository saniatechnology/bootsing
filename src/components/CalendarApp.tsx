"use client";

import { useState } from "react";
import Link from "next/link";
import { ChatPanel } from "./ChatPanel";
import { FilterBar } from "./FilterBar";
import { WeekSection } from "./WeekSection";
import { toIsoDate } from "@/lib/dates";
import { weekIndexForDate } from "@/lib/grid";
import type { CalendarEvent, CalendarMeta, GroupKey } from "@/lib/types";

interface CalendarAppProps {
  initialEvents: CalendarEvent[];
  meta: CalendarMeta;
}

export function CalendarApp({ initialEvents, meta }: CalendarAppProps) {
  const [events, setEvents] = useState(initialEvents);
  const [activeGroup, setActiveGroup] = useState<GroupKey | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const thisWeekIndex = weekIndexForDate(meta.weeks, toIsoDate(new Date()));
  const [weekIndex, setWeekIndex] = useState(thisWeekIndex);

  const lastWeek = meta.weeks.length - 1;
  const week = meta.weeks[weekIndex];

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

  const selectedEvents = events.filter((e) => selectedIds.has(e.id));

  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <h1>Bootsing</h1>
          <Link href="/configuration" className="settings-btn" aria-label="Open configuration" title="Configuration">
            <span className="material-symbols-outlined" aria-hidden="true">
              settings
            </span>
          </Link>
        </div>

        <div className="controls">
          <div className="week-nav">
            <button type="button" className="nav-btn nav-today" onClick={() => setWeekIndex(thisWeekIndex)}>
              This week
            </button>
            <button type="button" className="nav-btn" onClick={() => setWeekIndex((i) => Math.max(0, i - 1))} disabled={weekIndex === 0} aria-label="Previous week">
              &lsaquo;
            </button>
            <button type="button" className="nav-btn" onClick={() => setWeekIndex((i) => Math.min(lastWeek, i + 1))} disabled={weekIndex === lastWeek} aria-label="Next week">
              &rsaquo;
            </button>
          </div>

          <FilterBar meta={meta} activeGroup={activeGroup} onSelectGroup={setActiveGroup} />
        </div>
      </header>

      <WeekSection
        week={week}
        events={events}
        meta={meta}
        activeGroup={activeGroup}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelected}
      />

      <footer className="note">Ask the chat box (bottom right) to add, edit, or remove events &mdash; it edits this calendar&rsquo;s data directly, and can search the web first when you ask it to look something up.</footer>

      <ChatPanel
        onEventsChanged={setEvents}
        selectedEvents={selectedEvents}
        onClearSelection={clearSelected}
      />
    </div>
  );
}
