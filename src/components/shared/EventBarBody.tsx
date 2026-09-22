"use client";

import type { CalendarEvent } from "@/lib/types";
import { SelectBadge } from "./SelectBadge";

interface EventBarBodyProps {
  event: CalendarEvent;
  /** 1-based number shown in the badge when the event has no status. */
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
  /** Optional time label for the right end of the second line. */
  time?: string;
}

/**
 * The two-line content of an event bar: badge, name and "approx." on the first
 * line; venue and an optional time on the second. Shared by the Explore week
 * grid and both kinds of block in the Home hourly grid.
 */
export function EventBarBody({ event, index, selected, onToggleSelect, time }: EventBarBodyProps) {
  return (
    <>
      <div className="ev-row-line1">
        <SelectBadge
          index={index}
          eventName={event.name}
          selected={selected}
          onToggle={onToggleSelect}
          numClassName="ev-badge"
          status={event.status}
        />
        <span className="ev-name">{event.name}</span>
        {event.approx && <span className="approx">approx.</span>}
      </div>
      <div className="ev-row-line2">
        <span className="ev-venue">{event.venue}</span>
        {time && <span className="ev-time">{time}</span>}
      </div>
    </>
  );
}
