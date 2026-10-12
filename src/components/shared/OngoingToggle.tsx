"use client";

interface OngoingToggleProps {
  /** How many ongoing events overlap the current week. */
  count: number;
  /** Whether ongoing events are currently revealed. */
  show: boolean;
  onToggle: () => void;
}

/**
 * The bar shown beneath the week and list views to reveal or hide long-running
 * ("ongoing") events — multi-week exhibitions and festivals that would otherwise
 * clutter the one-off nights. Parents only render it when `count > 0`.
 */
export function OngoingToggle({ count, show, onToggle }: OngoingToggleProps) {
  return (
    <div className="ongoing-toggle">
      <button
        type="button"
        className="nav-btn ongoing-btn"
        aria-expanded={show}
        onClick={onToggle}
      >
        {show ? `Hide ongoing (${count})` : `Show ongoing (${count})`}
      </button>
    </div>
  );
}
