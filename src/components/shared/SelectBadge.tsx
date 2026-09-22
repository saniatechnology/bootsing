"use client";

import { STATUS_META } from "@/lib/status-meta";
import type { EventStatus } from "@/lib/types";

/**
 * The number badge that, on row hover or when the event is selected, becomes a
 * checkbox for manual selection. Shared by the week grids and the list table.
 * The hosting row must carry the `ev-selectable` class so the hover rules in
 * selection.css can reveal the checkbox.
 */
export function SelectBadge({
  index,
  eventName,
  selected,
  onToggle,
  numClassName,
  status,
}: {
  index: number;
  eventName: string;
  selected: boolean;
  onToggle: () => void;
  numClassName: string;
  /** When set, the status emoji replaces the number (saved events). */
  status?: EventStatus | null;
}) {
  const emoji = status ? STATUS_META[status].emoji : undefined;
  return (
    <span className="ev-select" onClick={(e) => e.stopPropagation()}>
      <span
        className={`ev-select-num ${numClassName}${emoji ? " has-emoji" : ""}`}
        aria-hidden="true"
      >
        {emoji ?? index}
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
