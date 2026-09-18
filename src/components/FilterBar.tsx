"use client";

import type { CalendarMeta, CategoryKey, GenreKey } from "@/lib/types";

interface FilterBarProps {
  meta: CalendarMeta;
  hiddenCats: ReadonlySet<CategoryKey>;
  hiddenGenres: ReadonlySet<GenreKey>;
  onToggleCat: (key: CategoryKey) => void;
  onToggleGenre: (key: GenreKey) => void;
  onResetCats: () => void;
}

export function FilterBar({
  meta,
  hiddenCats,
  hiddenGenres,
  onToggleCat,
  onToggleGenre,
  onResetCats,
}: FilterBarProps) {
  return (
    <div className="filters">
      <div className="filter-row">
        <span className="filter-label">Categories</span>
        {(Object.entries(meta.cats) as [CategoryKey, CalendarMeta["cats"][CategoryKey]][]).map(
          ([key, { label, color }]) => (
            <button
              key={key}
              type="button"
              className={`chip cat-chip${hiddenCats.has(key) ? " off" : ""}`}
              aria-pressed={!hiddenCats.has(key)}
              onClick={() => onToggleCat(key)}
            >
              <span className="catdot" style={{ background: color }} />
              {label}
            </button>
          )
        )}
        <button type="button" className="chip chip-reset" onClick={onResetCats}>
          Show all
        </button>
      </div>
      <div className="filter-row">
        <span className="filter-label">Music genre</span>
        {(Object.entries(meta.genreLabels) as [GenreKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`chip genre-chip${hiddenGenres.has(key) ? " off" : ""}`}
            aria-pressed={!hiddenGenres.has(key)}
            onClick={() => onToggleGenre(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
