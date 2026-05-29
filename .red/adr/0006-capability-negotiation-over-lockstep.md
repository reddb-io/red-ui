# 0006. One UI version serves many server versions via capability negotiation

## Status

Proposed

Date: 2026-05-29

## Context

The UI bundle is pinned and embedded into `red` (ADR-0003), shipped in the Tauri
app, and deployed at `ui.reddb.io` (ADR-0005). In practice all three open
servers of *varying* versions: a user runs several clusters at different reddb
versions, `red ui` may point at a remote server, and `ui.reddb.io` connects to
anything browser-reachable. So the embedded/hosted UI will routinely be older or
newer than the server it talks to.

`client.ts` already has the seed of a runtime strategy: it probes the
`GET /collections/:name` route and, on "route not found", disables the
collection-metadata feature for that server instead of erroring the whole UI.

## Decision

The UI negotiates **capabilities at runtime** and degrades gracefully. At
Bootstrap it reads the target's version/capabilities (`/stats` carries a version;
a `capabilities` surface generalises the existing probe) and **hides** controls
the server can't honour — not greys them out. This mirrors the project's
permission-aware rule ("if denied, the control is absent, not disabled"). One UI
version therefore supports a range of server versions.

## Consequences

- The unsupported-route probe in `client.ts` generalises into a capability map
  consulted by the UI when deciding which controls to render.
- Cross-repo: `../reddb` should expose a stable version/capabilities surface so
  negotiation is explicit rather than inferred from 404s.
- "Absent, not disabled" keeps the UI honest across versions and reuses an
  existing design principle, so older servers simply show fewer controls.
- We accept that a newer UI may reference capabilities an old server lacks; the
  negotiation must fail safe (hide) rather than assume presence.

## Alternatives considered

- **Lockstep** (UI talks only to its exact version). Simple, but breaks the
  multi-cluster reality and `red ui` against a differently-versioned remote.
  Rejected.
- **Hosted UI as sole source of truth** (`red ui --remote` always pulls the
  newest UI). Removes skew for the remote case, but adds a network dependency to
  a flow deliberately offline (ADR-0001/Embedded) and doesn't help the embedded
  or Tauri builds. Rejected as the general answer.
