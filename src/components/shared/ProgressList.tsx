"use client";

import { useLayoutEffect, useRef } from "react";
import type { ProgressLine } from "@/lib/progress";

/** The live column of progress lines for a running AI request, kept scrolled to the newest line. */
export function ProgressList({ lines }: { lines: ProgressLine[] }) {
  const ref = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <ul className="progress-stack" ref={ref}>
      {lines.map((line, i) => (
        <li key={i} className={`progress-line ${line.kind}`}>
          {line.text}
        </li>
      ))}
    </ul>
  );
}
