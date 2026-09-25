"use client";

import { Fragment, useState, type ReactNode } from "react";
import { fmtDateRange, fmtTimeRange } from "@/lib/dates";
import { groupLabelsOf, matchesGroup, primaryGroupColor } from "@/lib/event-meta";
import { buildWeekLayout } from "@/lib/grid";
import { activateOnKey } from "@/lib/keyboard";
import type { CalendarEvent, CalendarMeta, GroupKey } from "@/lib/types";
import type { WeekRange } from "@/lib/weeks";
import { EventLink } from "./EventLink";
import { SelectBadge } from "./SelectBadge";

interface EventListProps {
  week: WeekRange;
  events: CalendarEvent[];
  meta: CalendarMeta;
  activeGroup?: GroupKey | "all";
  selectedIds: ReadonlySet<number>;
  onToggleSelect: (id: number) => void;
  onEdit: (event: CalendarEvent) => void;
  /** The options panel shown below a row when it's expanded (rating / delete). */
  renderActions: (event: CalendarEvent) => ReactNode;
  /** Show the event's status emoji in place of the row number (Home). */
  statusBadge?: boolean;
  /** Label for the first column ("#" on Explore, "Hype" on Home). */
  firstColLabel?: string;
}

/**
 * The shared event table, used by both Explore and Home. Each row shows the
 * event's info plus a select checkbox, a "more info" link and an Edit button;
 * clicking the row opens an options panel below it, mirroring the expanded
 * detail in the week grid. Rows follow the grid's ordering and numbering.
 */
export function EventList({
  week,
  events,
  meta,
  activeGroup = "all",
  selectedIds,
  onToggleSelect,
  onEdit,
  renderActions,
  statusBadge = false,
  firstColLabel = "#",
}: EventListProps) {
  const layout = buildWeekLayout(events, week);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpanded = (id: number) => setExpandedId((prev) => (prev === id ? null : id));
  const visibleRows = layout.rows.filter((r) => matchesGroup(meta, r.event, activeGroup));
  if (visibleRows.length === 0) return null;

  return (
    <div className="detail-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            <th>{firstColLabel}</th>
            <th>Group</th>
            <th>Event</th>
            <th>Venue</th>
            <th>Date</th>
            <th>Time</th>
            <th>Cost</th>
            <th>Description</th>
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {visibleRows.map(({ event, index, clippedStart, clippedEnd }) => {
            const selected = selectedIds.has(event.id);
            const isOpen = expandedId === event.id;
            return (
              <Fragment key={event.id}>
                <tr
                  id={`ev-list-row-${event.id}`}
                  className={`ev-list-row ev-selectable${selected ? " selected" : ""}${isOpen ? " expanded" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-label={`Options for ${event.name}`}
                  onClick={() => toggleExpanded(event.id)}
                  onKeyDown={activateOnKey(() => toggleExpanded(event.id))}
                >
                  <td className="dnum-cell">
                    <SelectBadge
                      index={index}
                      eventName={event.name}
                      selected={selected}
                      onToggle={() => onToggleSelect(event.id)}
                      numClassName="dnum-num"
                      status={statusBadge ? event.status : null}
                    />
                  </td>
                  <td data-label="Group">
                    <span
                      className="catdot"
                      aria-hidden="true"
                      style={{ background: primaryGroupColor(meta, event) }}
                    />
                    {groupLabelsOf(meta, event)}
                  </td>
                  <td className="evn">
                    {event.name}
                    {event.approx && <span className="approx"> approx.</span>}
                  </td>
                  <td data-label="Venue">{event.venue}</td>
                  <td className="mono" data-label="Date">
                    {fmtDateRange(clippedStart, clippedEnd)}
                  </td>
                  <td className="mono" data-label="Time">
                    {fmtTimeRange(event.startTime, event.endTime)}
                  </td>
                  <td data-label="Cost">{event.cost}</td>
                  <td data-label="Info">{event.desc}</td>
                  <td>
                    <EventLink link={event.link} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="ev-list-edit-cell">
                    <button
                      type="button"
                      className="ev-action-btn"
                      aria-label={`Edit ${event.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(event);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="ev-list-detail">
                    <td colSpan={10}>
                      <div className="ev-list-actions" onClick={(e) => e.stopPropagation()}>
                        {renderActions(event)}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
