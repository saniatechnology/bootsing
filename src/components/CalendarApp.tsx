"use client";

import { useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { FilterBar } from "./FilterBar";
import { Legend } from "./Legend";
import { WeekSection } from "./WeekSection";
import type { CalendarEvent, CalendarMeta, CategoryKey, GenreKey } from "@/lib/types";

interface CalendarAppProps {
  initialEvents: CalendarEvent[];
  meta: CalendarMeta;
}

// Electronic/EDM is in the data (Sania wants it available) but starts hidden,
// with the "show all" reset and the individual chip both able to reveal it.
const INITIALLY_HIDDEN_GENRES: GenreKey[] = ["electronic"];

export function CalendarApp({ initialEvents, meta }: CalendarAppProps) {
  const [events, setEvents] = useState(initialEvents);
  const [hiddenCats, setHiddenCats] = useState<Set<CategoryKey>>(() => new Set());
  const [hiddenGenres, setHiddenGenres] = useState<Set<GenreKey>>(
    () => new Set(INITIALLY_HIDDEN_GENRES)
  );

  function toggleCat(key: CategoryKey) {
    setHiddenCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGenre(key: GenreKey) {
    setHiddenGenres((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="wrap">
      <header className="page">
        <h1>Barcelona Cultural Calendar</h1>
        <p className="subtitle">
          Aug 28 &ndash; Sep 27, 2026. Bars are sized to how long each event runs &mdash; short one-off
          events float to the top of each week, exhibitions and multi-day programs sit lower and stretch
          across the days they&rsquo;re open. Numbers on each bar match the detail row below it.
        </p>
        <Legend />
        <FilterBar
          meta={meta}
          hiddenCats={hiddenCats}
          hiddenGenres={hiddenGenres}
          onToggleCat={toggleCat}
          onToggleGenre={toggleGenre}
          onResetCats={() => setHiddenCats(new Set())}
        />
      </header>

      {meta.weeks.map((week, i) => (
        <WeekSection
          key={week.join("_")}
          weekNumber={i + 1}
          week={week}
          events={events}
          meta={meta}
          hiddenCats={hiddenCats}
          hiddenGenres={hiddenGenres}
        />
      ))}

      <footer className="note">
        Ask the chat box (bottom right) to add, edit, or remove events &mdash; it edits this calendar&rsquo;s
        data directly, and can search the web first when you ask it to look something up.
        <br />
        <br />
        Music genre tags are a best-effort read of each lineup&rsquo;s style, not an official classification.
      </footer>

      <ChatPanel onEventsChanged={setEvents} />
    </div>
  );
}
