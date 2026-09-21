"use client";

/**
 * The number badge that, on row hover or when the event is selected, becomes a
 * checkbox for manual selection. Shared by the week grids and the list table.
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
  /** Replaces the number for saved events (Home shows the status emoji instead). */
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
