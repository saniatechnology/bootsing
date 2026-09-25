"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface DayScrollerProps {
  /** Number of day columns inside, used to page by exactly one day. */
  dayCount: number;
  children: ReactNode;
}

/**
 * Wraps a week grid in a horizontal scroll area with prev/next arrows. On wide
 * screens the columns are `1fr` and everything fits, so the arrows (CSS) stay
 * hidden; on small screens the columns switch to a fixed viewport width and the
 * arrows page one day at a time.
 */
export function DayScroller({ dayCount, children }: DayScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: (dir * el.scrollWidth) / dayCount, behavior: "smooth" });
  };

  return (
    <div className="day-scroller">
      <div className="day-nav-bar">
        <button
          type="button"
          className="day-nav"
          aria-label="Show earlier days"
          onClick={() => page(-1)}
          disabled={atStart}
        >
          ‹
        </button>
        <button
          type="button"
          className="day-nav"
          aria-label="Show later days"
          onClick={() => page(1)}
          disabled={atEnd}
        >
          ›
        </button>
      </div>
      <div className="day-scroll" ref={ref}>
        {children}
      </div>
    </div>
  );
}
