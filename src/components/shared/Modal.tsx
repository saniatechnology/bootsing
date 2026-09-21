"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  title: ReactNode;
  /** Accessible name when `title` isn't plain text or should read differently. */
  ariaLabel?: string;
  onClose: () => void;
  /** Keep the dialog open (ignore overlay clicks, Escape and the close button) while work is in flight. */
  closeDisabled?: boolean;
  children: ReactNode;
}

/**
 * The app's one dialog shell: a dimmed overlay, a titled panel and a close
 * button. Clicking the overlay or pressing Escape closes it; focus moves into
 * the dialog on open (unless a child already took it, e.g. an autofocused
 * input) and returns to the opener on close.
 */
export function Modal({ title, ariaLabel, onClose, closeDisabled = false, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!panelRef.current?.contains(document.activeElement)) closeRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeDisabled, onClose]);

  const attemptClose = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      onClick={attemptClose}
    >
      <div className="modal" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{title}</span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={attemptClose}
            disabled={closeDisabled}
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
