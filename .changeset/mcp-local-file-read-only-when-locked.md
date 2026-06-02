---
"@reddb-io/ui-mcp": minor
---

The MCP App now opens a local `.rdb` `--read-only` when it is already held by
another writer instead of failing on reddb's single-writer `flock` (ADR-0006,
#50). When the caller does not pin a mode, `spawnLocalServer` opens read-write
first and, if the `red server` child dies acquiring the lock, transparently
retries with `--read-only`; reddb then reports `read_only` in `/stats` and the
UI renders the existing read-only badge (#23). The trigger case is inspecting an
agent's live memory `.rdb` while the agent is writing it. A file with no active
writer still opens read-write, and an explicit `readOnly` is honoured verbatim
with no fallback.
