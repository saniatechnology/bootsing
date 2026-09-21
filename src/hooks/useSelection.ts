"use client";

import { useCallback, useState } from "react";
import { removeFromSet, toggleAllInSet, toggleInSet } from "@/lib/selection";

export interface Selection {
  selectedIds: ReadonlySet<number>;
  /** Select or deselect one event. */
  toggle: (id: number) => void;
  /** Select every id unless all are already selected, in which case deselect them (a day header click). */
  toggleAll: (ids: readonly number[]) => void;
  /** Drop an id, e.g. after the event was deleted. */
  remove: (id: number) => void;
  clear: () => void;
}

/** The set of manually ticked event ids shared by the grid, list, bulk bar and chat. */
export function useSelection(): Selection {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(() => new Set());
  const toggle = useCallback((id: number) => setSelectedIds((prev) => toggleInSet(prev, id)), []);
  const toggleAll = useCallback(
    (ids: readonly number[]) => setSelectedIds((prev) => toggleAllInSet(prev, ids)),
    []
  );
  const remove = useCallback((id: number) => setSelectedIds((prev) => removeFromSet(prev, id)), []);
  const clear = useCallback(() => setSelectedIds(new Set()), []);
  return { selectedIds, toggle, toggleAll, remove, clear };
}
