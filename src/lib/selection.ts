/**
 * Immutable helpers for the "selected event ids" set used by both pages.
 * Each returns a new Set so React state updates see a changed reference.
 */

/** Add `id` if absent, remove it if present. */
export function toggleInSet<T>(set: ReadonlySet<T>, id: T): Set<T> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * Toggle a group of ids together: if every id is already selected, deselect
 * them all; otherwise select them all. Used for "select this whole day".
 */
export function toggleAllInSet<T>(set: ReadonlySet<T>, ids: readonly T[]): Set<T> {
  const next = new Set(set);
  if (ids.length === 0) return next;
  const allSelected = ids.every((id) => next.has(id));
  for (const id of ids) {
    if (allSelected) next.delete(id);
    else next.add(id);
  }
  return next;
}

/** Remove `id` (a no-op copy when it isn't selected). */
export function removeFromSet<T>(set: ReadonlySet<T>, id: T): Set<T> {
  const next = new Set(set);
  next.delete(id);
  return next;
}
