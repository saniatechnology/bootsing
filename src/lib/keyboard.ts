import type { KeyboardEvent } from "react";

/**
 * `onKeyDown` handler that makes a non-button element with `role="button"`
 * activate on Enter or Space like a real button would.
 */
export function activateOnKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}
