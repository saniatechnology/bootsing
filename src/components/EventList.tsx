"use client";

import { Fragment, useState, type ReactNode } from "react";
import { fmtDateRange } from "@/lib/dates";
import { buildWeekLayout } from "@/lib/grid";
import { STATUS_META } from "./StatusControls";
import type { CalendarEvent, CalendarMeta, GroupKey, IsoDate } from "@/lib/types";

/**
 * The number badge that, on row hover or when the event is selected, becomes a
 * checkbox for manual selection. Shared by the week grid and the list table.
 */
export function SelectBadge({
  index,
  eventName,
  selected,
  onToggle,
  numClassName,
  statusEmoji,
}: {
  index: number;
  eventName: string;
  selected: boolean;
  onToggle: () => void;
  numClassName: string;
  statusEmoji?: string;
}) {
  return (
    <span className="ev-select" onClick={(e) => e.stopPropagation()}>
      <span className={numClassName} aria-hidden="true">
        {statusEmoji ?? index}
      </span>
      <input
        type="checkbox"
        className="ev-select-box"
        checked={selected}
        onChange={onToggle}
        aria-label={`Select ${eventName}`}
      />
    </span>
  );
}

interface EventListProps {
  week: [IsoDate, IsoDate];
  events: CalendarEvent[];
  meta: CalendarMeta;
  activeGroup?: GroupKey | "all";
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onEdit: (event: CalendarEvent) => void;
  /** The options panel shown below a row when it's expanded (rating / delete). */
  renderActions: (event: CalendarEvent) => ReactNode;
  /** Controlled expansion (used so Home's hourly blocks can open a row). */
  expandedId?: number | null;
  onExpandedChange?: (id: number | null) => void;
  /** Tint rows by status (Home only; Explore leaves tagged events uncolored). */
  statusColors?: boolean;
  /** Show the event's status emoji in place of the row number (Home). */
  statusBadge?: boolean;
  /** Label for the first column ("#" on Explore, "Hype" on Home). */
  firstColLabel?: string;
}

/**
 * The shared event list, used by both Explore and Home. Each row shows the
 * event's info plus a select checkbox, a "more info" link and an Edit button;
 * clicking the row opens an options panel below it (rating / delete), mirroring
 * the expanded detail in the week grid.
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
  expandedId,
  onExpandedChange,
  statusColors = false,
  statusBadge = false,
  firstColLabel = "#",
}: EventListProps) {
  const layout = buildWeekLayout(events, week);
  const [localExpanded, setLocalExpanded] = useState<number | null>(null);
  const controlled = onExpandedChange !== undefined;
  const expanded = controlled ? expandedId ?? null : localExpanded;

  function toggleExpanded(id: number) {
    const next = expanded === id ? null : id;
    if (controlled) onExpandedChange!(next);
    else setLocalExpanded(next);
  }

  function isHidden(event: CalendarEvent): boolean {
    if (activeGroup === "all") return false;
    return !meta.catGroups[event.cat]?.includes(activeGroup);
  }
  function groupsOf(event: CalendarEvent): GroupKey[] {
    return meta.catGroups[event.cat] ?? [];
  }
  function colorOf(event: CalendarEvent): string {
    const primary = groupsOf(event)[0];
    return primary ? meta.groupColors[primary] : "var(--text-muted)";
  }

  const visibleRows = layout.rows.filter((r) => !isHidden(r.event));
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
            <th>Cost</th>
            <th>Description</th>
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {layout.rows.map((row) => {
            const { event, index, clippedStart, clippedEnd } = row;
            if (isHidden(event)) return null;
            const selected = selectedIds.has(event.id);
            const isOpen = expanded === event.id;
            return (
              <Fragment key={event.id}>
                <tr
                  id={`ev-list-row-${event.id}`}
                  className={`ev-list-row${selected ? " selected" : ""}${isOpen ? " expanded" : ""}${statusColors && event.status ? ` status-${event.status}` : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-label={`Options for ${event.name}`}
                  onClick={() => toggleExpanded(event.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpanded(event.id);
                    }
                  }}
                >
                  <td className="dnum-cell">
                    <SelectBadge
                      index={index}
                      eventName={event.name}
                      selected={selected}
                      onToggle={() => onToggleSelect(event.id)}
                      numClassName="dnum-num"
                      statusEmoji={statusBadge && event.status ? STATUS_META[event.status].emoji : undefined}
                    />
                  </td>
                  <td>
                    <span className="catdot" style={{ background: colorOf(event) }} />
                    {groupsOf(event).map((g) => meta.groupLabels[g]).join(" · ")}
                  </td>
                  <td className="evn">
                    {event.name}
                    {event.approx && <span className="approx"> approx.</span>}
                  </td>
                  <td>{event.venue}</td>
                  <td className="mono">{fmtDateRange(clippedStart, clippedEnd)}</td>
                  <td>{event.cost}</td>
                  <td>{event.desc}</td>
                  <td>
                    <a href={event.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      More info &#8599;
                    </a>
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
                  <tr className="ev-list-detail" key={`${event.id}-detail`}>
                    <td colSpan={9}>
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
