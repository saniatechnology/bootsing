"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOffline } from "@/hooks/useOffline";
import { StatusIndicator } from "./StatusIndicator";
import { TopBar } from "./TopBar";

/** Full-page fallback when the initial server-side data load fails. */
export function LoadErrorScreen({ message }: { message: string }) {
  const router = useRouter();
  const offline = useOffline();
  const [error, setError] = useState<string | null>(message);
  return (
    <div className="wrap">
      <header className="page">
        <TopBar
          showNavigation={false}
          status={
            <StatusIndicator error={error} offline={offline} onDismiss={() => setError(null)} />
          }
        />
      </header>
      <div className="load-error">
        <p className="load-error-title">We couldn&rsquo;t load your calendar.</p>
        <p className="load-error-note">Open the status icon above for details, then try again.</p>
        <button type="button" className="nav-btn" onClick={() => router.refresh()}>
          Try again
        </button>
      </div>
    </div>
  );
}
