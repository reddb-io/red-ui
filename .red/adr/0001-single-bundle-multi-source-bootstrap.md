# 0001. Single static bundle with a multi-source Connection Bootstrap

## Status

Proposed

Date: 2026-05-29

## Context

red-ui ships into three delivery contexts (Surfaces): **Embedded** (vendored
into the `red` binary, served same-origin by `red ui <file>`), **Standalone**
(the Tauri desktop app), and **Web** (`ui.reddb.io`). Each Surface has a
different natural channel for learning *which reddb to talk to* and *with what
session*: Tauri exposes an IPC bridge, the Web Surface is handed a target via
URL params (and a session cookie or token), and the Embedded Surface knows the
local server URL it just spawned.

The SvelteKit app is already built with `adapter-static` and the
`svelte.config.js` comment states the intent that "the same static bundle work
at the site root (embedded in the `red` server / Tauri / dev) AND under a
subpath". What does **not** exist yet is any mechanism for a Surface to inject
the connection target/session at boot — there is no URL-param, injected-global,
or IPC handling in the codebase today. Connection state is currently read only
from presets + localStorage, gated behind the encrypted-vault unlock.

## Decision

We will keep **one** static bundle for all Surfaces and introduce a single
**Connection Bootstrap** reader that resolves the boot target from a fixed
source priority:

1. Tauri IPC (Standalone)
2. Host-injected global, e.g. `window.__RED_BOOTSTRAP__` (Web with session)
3. URL param — the Open Contract (`cs`, `token` in `#hash`, `to`)
4. Persisted local store (returning users / manual connect)

Each Surface populates whichever source is natural to it; the bundle itself is
Surface-agnostic. No per-Surface build variants.

## Consequences

- One artifact to build, test, and version — the bundle is the unit that every
  Surface and consumer (see ADR-0003) embeds or deploys.
- The Bootstrap becomes the single seam where session/auth differences between
  Surfaces are expressed (see ADR-0004), keeping the rest of the UI uniform.
- The boot path must tolerate "no source present" (cold open with no target) and
  fall back to the Connect screen, so the reader needs a well-defined empty case.
- The hard vault-lock gate in `+layout.svelte` (which today blocks all network
  traffic until master-password unlock) must become Surface-aware, or the
  credential-less Surfaces will be wrongly blocked at boot.

## Alternatives considered

- **Separate builds per Surface.** Cleanest isolation, but triples maintenance
  and divergence risk for three targets that differ only in how a target URL +
  session arrive. Rejected — the difference is data, not code.
- **Single injection mechanism (only URL params, or only injected global).**
  Simpler reader, but no single channel fits all three Surfaces: URL params leak
  tokens and don't suit Tauri; an injected global can't express a user-typed
  ad-hoc URL. A priority-ordered multi-source reader covers all three with one
  bundle.
