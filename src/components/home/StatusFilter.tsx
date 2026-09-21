"use client";

import { STATUS_META } from "@/lib/status-meta";
import { EVENT_STATUS_KEYS } from "@/lib/types";
import type { EventStatus } from "@/lib/types";

/** Home's chips for narrowing saved events to one status, with counts. */
export function StatusFilter({
  value,
  counts,
  total,
  onChange,
}: {
  value: EventStatus | "all";
  counts: Record<EventStatus, number>;
  total: number;
  onChange: (next: EventStatus | "all") => void;
}) {
  return (
    <div className="status-filter" role="group" aria-label="Filter by status">
      <button
        type="button"
        className={`filter-chip${value === "all" ? " is-active" : ""}`}
        aria-pressed={value === "all"}
        onClick={() => onChange("all")}
      >
        All <span className="filter-count">{total}</span>
      </button>
      {EVENT_STATUS_KEYS.map((s) => (
        <button
          key={s}
          type="button"
          className={`filter-chip status-${s}${value === s ? " is-active" : ""}`}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          <span className="filter-chip-emoji" aria-hidden="true">
            {STATUS_META[s].emoji}
          </span>
          {STATUS_META[s].label} <span className="filter-count">{counts[s]}</span>
        </button>
      ))}
    </div>
  );
}
