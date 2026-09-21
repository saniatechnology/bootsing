import Link from "next/link";
import type { ReactNode } from "react";

interface TopBarProps {
  /** Carried in the Home/Explore links so switching pages keeps the same week. */
  weekIndex?: number;
  /** The connection status indicator. */
  status: ReactNode;
  /** Page-specific buttons shown before the settings link. */
  actions?: ReactNode;
  /** Whether to show the Home title link and the Explore link (false on the error screen). */
  showNavigation?: boolean;
}

/** The header row shared by every calendar page: title, area link, status and settings. */
export function TopBar({ weekIndex, status, actions, showNavigation = true }: TopBarProps) {
  const query = weekIndex === undefined ? "" : `?w=${weekIndex}`;
  return (
    <div className="topbar">
      {showNavigation ? (
        <div className="topbar-title">
          <h1>
            <Link href={`/${query}`} className="title-link">
              Bootsing
            </Link>
          </h1>
          <Link href={`/explore${query}`} className="area-link">
            Explore
          </Link>
        </div>
      ) : (
        <h1>Bootsing</h1>
      )}
      <div className="topbar-actions">
        {status}
        {actions}
        <Link
          href="/configuration"
          className="settings-btn"
          aria-label="Open configuration"
          title="Configuration"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            settings
          </span>
        </Link>
      </div>
    </div>
  );
}
