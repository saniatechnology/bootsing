"use client";

import { GROUP_KEYS } from "@/lib/types";
import type { CalendarMeta, GroupKey } from "@/lib/types";

interface FilterBarProps {
  meta: CalendarMeta;
  activeGroup: GroupKey | "all";
  onSelectGroup: (group: GroupKey | "all") => void;
}

/** Explore's group filter chips: All, plus one per configured group in its colour. */
export function FilterBar({ meta, activeGroup, onSelectGroup }: FilterBarProps) {
  const options: { key: GroupKey | "all"; label: string; color?: string }[] = [
    { key: "all", label: "All" },
    ...GROUP_KEYS.map((key) => ({
      key,
      label: meta.groupLabels[key],
      color: meta.groupColors[key],
    })),
  ];

  return (
    <div className="group-filter" role="group" aria-label="Filter events by group">
      {options.map(({ key, label, color }) => (
        <button
          key={key}
          type="button"
          className={`group-chip${activeGroup === key ? " on" : ""}`}
          aria-pressed={activeGroup === key}
          onClick={() => onSelectGroup(key)}
        >
          {color && <span className="catdot" aria-hidden="true" style={{ background: color }} />}
          {label}
        </button>
      ))}
    </div>
  );
}
