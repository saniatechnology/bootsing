import type { ReactNode } from "react";
import { fmtDateRange, fmtTimeRange } from "@/lib/dates";
import { groupLabelsOf, primaryGroupColor } from "@/lib/event-meta";
import type { CalendarEvent, CalendarMeta } from "@/lib/types";
import { EventLink } from "./EventLink";

interface EventDetailProps {
  event: CalendarEvent;
  meta: CalendarMeta;
  /** The dates to show; the week grid passes the range clipped to the visible week. */
  range: [Date, Date];
  /** Buttons for this event (save / edit / delete, or the status controls). */
  actions: ReactNode;
}

/** The expanded information panel for one event, shared by the Explore grid and the Home hourly view. */
export function EventDetail({ event, meta, range, actions }: EventDetailProps) {
  return (
    <div className="ev-detail-inner">
      <div className="ev-detail-head">
        <span
          className="catdot"
          aria-hidden="true"
          style={{ background: primaryGroupColor(meta, event) }}
        />
        <span className="ev-detail-groups">{groupLabelsOf(meta, event)}</span>
        <span className="ev-detail-title">{event.name}</span>
        {event.approx && <span className="approx">approx.</span>}
      </div>
      <dl className="ev-detail-grid">
        <div>
          <dt>Venue</dt>
          <dd>{event.venue}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd className="mono">{fmtDateRange(range[0], range[1])}</dd>
        </div>
        {event.startTime && (
          <div>
            <dt>Time</dt>
            <dd className="mono">{fmtTimeRange(event.startTime, event.endTime)}</dd>
          </div>
        )}
        <div>
          <dt>Cost</dt>
          <dd>{event.cost}</dd>
        </div>
        <div className="ev-detail-desc">
          <dt>Description</dt>
          <dd>{event.desc}</dd>
        </div>
      </dl>
      <EventLink link={event.link} className="ev-detail-link" />
      <div className="ev-detail-actions">{actions}</div>
    </div>
  );
}
