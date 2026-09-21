"use client";

import { useState } from "react";
import type { ErrorReporter } from "@/hooks/useConnectionStatus";
import { api, errorMessage } from "@/lib/api";
import { CATEGORY_KEYS, GENRE_KEYS } from "@/lib/types";
import type { CalendarEvent, CalendarMeta, CategoryKey, GenreKey, IsoDate } from "@/lib/types";
import type { NewEventInput } from "@/lib/validation";
import { Modal } from "./Modal";

/** What the form is for: editing an existing event, or adding a new one on a given date. */
export type EventFormTarget =
  { kind: "edit"; event: CalendarEvent } | { kind: "new"; date: IsoDate };

interface EventFormProps extends ErrorReporter {
  meta: CalendarMeta;
  target: EventFormTarget;
  /** Receives the full, updated event list after a successful save. */
  onSaved: (events: CalendarEvent[]) => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  venue: string;
  cat: CategoryKey;
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  cost: string;
  desc: string;
  link: string;
  approx: boolean;
  genre: GenreKey;
}

function initialState(target: EventFormTarget): FormState {
  const event = target.kind === "edit" ? target.event : null;
  const defaultDate = target.kind === "new" ? target.date : "";
  return {
    name: event?.name ?? "",
    venue: event?.venue ?? "",
    cat: event?.cat ?? "IND",
    start: event?.start ?? defaultDate,
    end: event?.end ?? defaultDate,
    startTime: event?.startTime ?? "",
    endTime: event?.endTime ?? "",
    cost: event?.cost ?? "",
    desc: event?.desc ?? "",
    link: event?.link ?? "",
    approx: event?.approx ?? false,
    genre: event?.genre ?? "other",
  };
}

/** The form fields as the API expects them; the same shape serves both create and patch. */
function toInput(form: FormState): NewEventInput {
  return {
    name: form.name.trim(),
    venue: form.venue.trim(),
    cat: form.cat,
    start: form.start,
    end: form.end,
    startTime: form.startTime.trim() || null,
    endTime: form.endTime.trim() || null,
    cost: form.cost,
    desc: form.desc,
    link: form.link.trim(),
    approx: form.approx,
    // Genre only means something for music; clear it for every other category.
    genre: form.cat === "MUS" ? form.genre : null,
  };
}

export function EventForm({
  meta,
  target,
  onSaved,
  onCancel,
  reportError,
  clearError,
}: EventFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(target));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = target.kind === "edit";
  const title = isEdit ? "Edit event" : "Add event";

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
    try {
      const input = toInput(form);
      const events =
        target.kind === "edit"
          ? await api.updateEvent(target.event.id, input)
          : await api.createEvent(input);
      clearError();
      onSaved(events);
    } catch (err) {
      const message = errorMessage(err, "Couldn't save the event.");
      setError(message);
      reportError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel} closeDisabled={saving}>
      <form className="event-form" onSubmit={handleSubmit}>
        <label className="field field-wide">
          <span>Name</span>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            autoFocus
          />
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
            <select
              value={form.genre}
              onChange={(e) => update("genre", e.target.value as GenreKey)}
            >
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
          <input
            type="date"
            value={form.start}
            onChange={(e) => update("start", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>End date</span>
          <input
            type="date"
            value={form.end}
            onChange={(e) => update("end", e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Start time</span>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => update("startTime", e.target.value)}
          />
        </label>

        <label className="field">
          <span>End time</span>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => update("endTime", e.target.value)}
          />
        </label>

        <label className="field">
          <span>Cost</span>
          <input
            value={form.cost}
            onChange={(e) => update("cost", e.target.value)}
            placeholder="Free, €15, Unknown…"
          />
        </label>

        <label className="field field-check">
          <input
            type="checkbox"
            checked={form.approx}
            onChange={(e) => update("approx", e.target.checked)}
          />
          <span>Date is approximate</span>
        </label>

        <label className="field field-wide">
          <span>Link</span>
          <input
            type="url"
            value={form.link}
            onChange={(e) => update("link", e.target.value)}
            placeholder="https://…"
          />
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
    </Modal>
  );
}
