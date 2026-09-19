import Link from "next/link";
import type { Metadata } from "next";
import { PREFERENCES_INTRO, PREFERENCE_SECTIONS } from "@/lib/preferences";

export const metadata: Metadata = {
  title: "Configuration — Bootsing",
};

export default function ConfigurationPage() {
  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <h1>Configuration</h1>
          <Link href="/" className="settings-btn" aria-label="Back to calendar" title="Back to calendar">
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </Link>
        </div>
        <p className="subtitle">{PREFERENCES_INTRO}</p>
      </header>

      <div className="config-grid">
        {PREFERENCE_SECTIONS.map((section) => (
          <section className="config-card" key={section.title}>
            <h2 className="config-title">{section.title}</h2>
            {section.note && <p className="config-note">{section.note}</p>}
            {section.items.length === 0 ? (
              <p className="config-empty">{section.emptyText ?? "None yet."}</p>
            ) : (
              <ul className="config-list">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <span className="config-item-label">{item.label}</span>
                    {item.detail && <span className="config-item-detail">{item.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
