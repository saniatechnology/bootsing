-- Per-event saved state for the Home page. NULL = not saved (explore-only).
-- Orthogonal to `cat`/`genre` (the taxonomy); this is the user's own triage.
alter table public.events
  add column status text check (status in ('interesting', 'boots', 'maybe'));
