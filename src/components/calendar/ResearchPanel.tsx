"use client";

import type { ProgressLine } from "@/lib/progress";
import { ProgressList } from "../shared/ProgressList";

/** Live progress for a research run in the current week, with a cancel button. */
export function ResearchPanel({
  lines,
  onCancel,
}: {
  lines: ProgressLine[];
  onCancel: () => void;
}) {
  return (
    <div className="research-progress">
      <ProgressList lines={lines} />
      <div className="week-empty-actions">
        <button type="button" className="nav-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
