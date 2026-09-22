# Manual research notes

Historical artefacts from populating the calendar by hand, before (and
alongside) the in-app "research this week" feature. **Nothing in the running
app reads these files.**

- `research-brief.md`: the brief given to an AI assistant with web-browsing
  tools to research a set of weeks and insert the results directly into the
  database. Useful as a template if you want a deeper, browser-driven pass than
  the in-app research does.
- `research-log.md`: per-source notes from those passes (which venue sites are
  fetchable, what was blocked, what to check next time).
- `researched-events.json`: the output of one such pass, in the app's event
  shape, kept for reference.

The starter dataset the app seeds from lives in `supabase/seed/`.
