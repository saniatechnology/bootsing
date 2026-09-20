"use client";

import { useState } from "react";
import { CATEGORY_KEYS, GENRE_KEYS } from "@/lib/types";
import type { CalendarEvent, CalendarMeta, CategoryKey, GenreKey } from "@/lib/types";

interface EventFormProps {
  meta: CalendarMeta;
  /** The event being edited, or null when creating a new one. */
  event: CalendarEvent | null;
  /** Default start/end date for a new event (the visible week's start). */
  defaultDate: string;
  onSaved: (events: CalendarEvent[]) => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  venue: string;
  cat: CategoryKey;
  start: string;
  end: string;
  cost: string;
  desc: string;
  link: string;
  approx: boolean;
  genre: GenreKey;
}

function initialState(event: CalendarEvent | null, defaultDate: string): FormState {
  return {
    name: event?.name ?? "",
    venue: event?.venue ?? "",
    cat: event?.cat ?? "IND",
    start: event?.start ?? defaultDate,
    end: event?.end ?? defaultDate,
    cost: event?.cost ?? "",
    desc: event?.desc ?? "",
    link: event?.link ?? "",
    approx: event?.approx ?? false,
    genre: event?.genre ?? "other",
  };
}

export function EventForm({ meta, event, defaultDate, onSaved, onCancel }: EventFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(event, defaultDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = event !== null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (!form.name.trim() || !form.venue.trim()) {
      setError("Name and venue are required.");
      return;
    }
    if (form.end < form.start) {
      setError("End date can't be before the start date.");
      return;
    }

    setSaving(true);
    setError(null);

    // genre only applies to the MUS category; null it out otherwise.
    const genre = form.cat === "MUS" ? form.genre : null;
    const payload = {
      name: form.name.trim(),
      venue: form.venue.trim(),
      cat: form.cat,
      start: form.start,
      end: form.end,
      cost: form.cost,
      desc: form.desc,
      link: form.link,
      approx: form.approx,
      ...(form.cat === "MUS" ? { genre: form.genre } : isEdit ? { genre } : {}),
    };

    const url = isEdit ? `/api/events/${event.id}` : "/api/events";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      onSaved(data.events as CalendarEvent[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit event" : "Add event"} onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{isEdit ? "Edit event" : "Add event"}</span>
          <button type="button" aria-label="Close" onClick={onCancel}>
            &times;
          </button>
        </div>

        <form className="event-form" onSubmit={handleSubmit}>
          <label className="field field-wide">
            <span>Name</span>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} required autoFocus />
          </label>

          <label className="field field-wide">
            <span>Venue</span>
            <input value={form.venue} onChange={(e) => update("venue", e.target.value)} required />
          </label>

          <label className="field">
            <span>Category</span>
            <select value={form.cat} onChange={(e) => update("cat", e.target.value as CategoryKey)}>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {meta.cats[key]?.label ?? key}
                </option>
              ))}
            </select>
          </label>

          {form.cat === "MUS" && (
            <label className="field">
              <span>Music genre</span>
              <select value={form.genre} onChange={(e) => update("genre", e.target.value as GenreKey)}>
                {GENRE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {meta.genreLabels[key] ?? key}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            <span>Start date</span>
            <input type="date" value={form.start} onChange={(e) => update("start", e.target.value)} required />
          </label>

          <label className="field">
            <span>End date</span>
            <input type="date" value={form.end} onChange={(e) => update("end", e.target.value)} required />
          </label>

          <label className="field">
            <span>Cost</span>
            <input value={form.cost} onChange={(e) => update("cost", e.target.value)} placeholder="Free, €15, Unknown…" />
          </label>

          <label className="field field-check">
            <input type="checkbox" checked={form.approx} onChange={(e) => update("approx", e.target.checked)} />
            <span>Date is approximate</span>
          </label>

          <label className="field field-wide">
            <span>Link</span>
            <input value={form.link} onChange={(e) => update("link", e.target.value)} placeholder="https://…" />
          </label>

          <label className="field field-wide">
            <span>Description</span>
            <textarea value={form.desc} onChange={(e) => update("desc", e.target.value)} rows={3} />
          </label>

          {error && <p className="event-form-error">{error}</p>}

          <div className="event-form-actions">
            <button type="button" className="ef-cancel" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ef-save" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
