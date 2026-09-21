-- Add optional start/end times to events. Dates (starts/ends) still drive the
-- calendar grid; these are display-only, HH:MM 24h strings, null when unknown.
alter table public.events
  add column start_time text,
  add column end_time text;
