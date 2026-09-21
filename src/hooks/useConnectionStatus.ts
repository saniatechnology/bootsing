"use client";

import { useCallback, useState } from "react";
import { useOffline } from "./useOffline";

/** The pair of callbacks child components use to surface request failures in the top bar. */
export interface ErrorReporter {
  reportError: (message: string) => void;
  clearError: () => void;
}

export interface ConnectionStatus extends ErrorReporter {
  /** The most recent request failure, until cleared by a success or the user. */
  error: string | null;
  offline: boolean;
}

/** Page-level connection state shown by `StatusIndicator`: the last error plus the browser's online flag. */
export function useConnectionStatus(): ConnectionStatus {
  const [error, setError] = useState<string | null>(null);
  const offline = useOffline();
  const reportError = useCallback((message: string) => setError(message), []);
  const clearError = useCallback(() => setError(null), []);
  return { error, offline, reportError, clearError };
}
