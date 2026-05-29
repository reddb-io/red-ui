# 0007. `red ui <file>` is lock-aware: read-only when the file is in use

## Status

Proposed

Date: 2026-05-29

## Context

The triggering use case for the Embedded Surface is *viewing a memory `.rdb`
that an agent is actively writing* (the red-skills memory store). reddb's file
backing is single-writer; a second read-write opener would contend for the lock.
`red server` already supports `--read-only`, but whether a read-only opener can
attach to a file that an active writer holds is a `../reddb` capability that must
be confirmed.

Defaulting `red ui <file>` to read-write (sqlite3-like) is the friendliest
ergonomic when the file is free, but unsafe/contending when it isn't.

## Decision

`red ui <file>` is **lock-aware**:

- If the file is already open by another process, it opens **read-only** and the
  UI shows a visible "read-only — file in use" badge.
- Otherwise it opens read-write.
- `--read-only` / `--write` override the auto-detection explicitly.

## Consequences

- The common "watch my agent's live memory" case works without fighting the
  writer, and the read-only state is surfaced, not silent.
- Cross-repo dependency: `../reddb` must support **concurrent read-only open
  alongside an active writer** (the `--read-only` flag exists; concurrent-with-
  writer is the open question). If reddb cannot, the fallback degrades to "file
  busy — try again" rather than read-only.
- The UI needs a first-class read-only mode anyway (it pairs with ADR-0006's
  capability hiding and the Web Surface's read-only-on-untrusted cases).

## Alternatives considered

- **Read-write by default, `--read-only` opt-in.** sqlite3-like, but risks
  lock contention exactly in the motivating live-memory case. Rejected as the
  default.
- **Read-only by default, `--write` opt-in.** Safe, but makes the common
  "open my own db and edit it" case require a flag. Rejected — auto-detection
  gives both behaviours without a mode the user must remember.
