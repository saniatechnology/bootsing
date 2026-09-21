"use client";

import { useState } from "react";
import Link from "next/link";
import type { Preferences, PreferenceSection } from "@/lib/validation";

interface ConfigurationEditorProps {
  initial: Preferences;
}

type SaveState =
  { status: "idle" | "saving" } | { status: "saved" } | { status: "error"; message: string };

export function ConfigurationEditor({ initial }: ConfigurationEditorProps) {
  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  function markDirty(next: Preferences) {
    setPrefs(next);
    setSave({ status: "idle" });
  }

  function updateSection(index: number, patch: Partial<PreferenceSection>) {
    markDirty({
      ...prefs,
      sections: prefs.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  }

  function updateItem(
    sectionIndex: number,
    itemIndex: number,
    patch: { label?: string; detail?: string }
  ) {
    updateSection(sectionIndex, {
      items: prefs.sections[sectionIndex].items.map((it, i) =>
        i === itemIndex ? { ...it, ...patch } : it
      ),
    });
  }

  function addItem(sectionIndex: number) {
    updateSection(sectionIndex, {
      items: [...prefs.sections[sectionIndex].items, { label: "" }],
    });
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    updateSection(sectionIndex, {
      items: prefs.sections[sectionIndex].items.filter((_, i) => i !== itemIndex),
    });
  }

  function addSection() {
    markDirty({ ...prefs, sections: [...prefs.sections, { title: "New section", items: [] }] });
  }

  function removeSection(index: number) {
    markDirty({ ...prefs, sections: prefs.sections.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    setSave({ status: "saving" });
    // Drop blank items and trim so we don't persist empty rows.
    const payload: Preferences = {
      intro: prefs.intro,
      sections: prefs.sections.map((s) => ({
        title: s.title,
        note: s.note?.trim() ? s.note : undefined,
        emptyText: s.emptyText?.trim() ? s.emptyText : undefined,
        items: s.items
          .filter((it) => it.label.trim() !== "")
          .map((it) => ({
            label: it.label.trim(),
            detail: it.detail?.trim() ? it.detail.trim() : undefined,
          })),
      })),
    };

    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSave({ status: "error", message: data.error ?? "Something went wrong." });
        return;
      }
      setPrefs(data.preferences as Preferences);
      setSave({ status: "saved" });
    } catch (err) {
      setSave({ status: "error", message: err instanceof Error ? err.message : "Network error." });
    }
  }

  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <h1>Configuration</h1>
          <Link
            href="/"
            className="settings-btn"
            aria-label="Back to calendar"
            title="Back to calendar"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </Link>
        </div>
        <label className="config-intro-field">
          <span>Intro</span>
          <textarea
            value={prefs.intro}
            onChange={(e) => markDirty({ ...prefs, intro: e.target.value })}
            rows={2}
          />
        </label>
      </header>

      <div className="config-grid">
        {prefs.sections.map((section, si) => (
          <section className="config-card config-card-edit" key={si}>
            <div className="config-card-head">
              <input
                className="config-title-input"
                value={section.title}
                onChange={(e) => updateSection(si, { title: e.target.value })}
                placeholder="Section title"
              />
              <button
                type="button"
                className="ev-action-btn ev-action-delete"
                onClick={() => removeSection(si)}
              >
                Remove
              </button>
            </div>

            <input
              className="config-note-input"
              value={section.note ?? ""}
              onChange={(e) => updateSection(si, { note: e.target.value })}
              placeholder="Optional note"
            />

            <ul className="config-edit-list">
              {section.items.map((item, ii) => (
                <li key={ii} className="config-edit-item">
                  <input
                    value={item.label}
                    onChange={(e) => updateItem(si, ii, { label: e.target.value })}
                    placeholder="Label"
                  />
                  <input
                    value={item.detail ?? ""}
                    onChange={(e) => updateItem(si, ii, { detail: e.target.value })}
                    placeholder="Optional detail"
                  />
                  <button
                    type="button"
                    className="config-item-remove"
                    aria-label="Remove item"
                    onClick={() => removeItem(si, ii)}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>

            <button type="button" className="ev-action-btn" onClick={() => addItem(si)}>
              + Add item
            </button>
          </section>
        ))}
      </div>

      <div className="config-toolbar">
        <button type="button" className="ev-action-btn" onClick={addSection}>
          + Add section
        </button>
        <div className="config-save-group">
          {save.status === "saved" && <span className="config-save-msg">Saved</span>}
          {save.status === "error" && <span className="config-save-err">{save.message}</span>}
          <button
            type="button"
            className="ef-save config-save-btn"
            onClick={handleSave}
            disabled={save.status === "saving"}
          >
            {save.status === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
