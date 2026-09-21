"use client";

import type { ReactNode } from "react";

interface BulkFabProps {
  /** Positioning class, e.g. `bulk-delete-fab`. */
  className: string;
  label: string;
  title: string;
  /** Whether any events are selected; hidden FABs are made inert so they can't be reached. */
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** One of the floating action buttons that slide in when events are selected. */
export function BulkFab({
  className,
  label,
  title,
  active,
  disabled,
  onClick,
  children,
}: BulkFabProps) {
  return (
    <button
      type="button"
      className={`bulk-fab ${className}${active ? " is-visible" : ""}`}
      aria-label={label}
      title={title}
      inert={!active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
