---
"@reddb-io/ui": minor
---

Settings: per-section search + config export (PRD #69, #74).

The settings shell gains a focusable per-section search (⌘K idiom) that filters
the data-driven registry within the active section by config key or human label,
with **per-section query state** so switching sections preserves what you typed.
The nav footer gains an **Export config** action that downloads the live config
snapshot (read from `connection.client`) as JSON.

Note: import/reset are intentionally not shipped — the reddb client exposes no
config write/reset endpoint, so they would have no real target (the project's
"live or empty, never fake" rule). Export reflects the read-only reality.
