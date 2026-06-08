# Config / Secret / Policy authoring rides reddb's SQL surface, not REST

The red-ui **Settings surface** (the Config / Secrets / Policies panes) reads and
writes all three reddb stores through the **query/SQL surface** the RedClient
already speaks — `SHOW CONFIG` / `SET CONFIG`, `SET SECRET`, and policy DDL —
rather than reddb's per-key REST endpoints. Permission-aware rendering is driven
orthogonally by `POST /auth/can`.

## Status

accepted — 2026-06-03. Decided during `/start` grilling of the
hermes-desktop-inspired settings editor (PRD/issues TBD under the "Hermes →
red.config policy editor" initiative, starting with a discovery slice). Builds on
ADR-0001 (one Core), and the reddb security contract
`../reddb/docs/security/config-secrets-vault-design.md`.

## Context

reddb exposes **two** ways to author configuration and secrets:

- a **SQL surface** — `SHOW CONFIG [prefix]` (introspection; `resolve_config_schema`
  attaches a value-type + `schema_version` to each entry, and `config_matrix`
  governs always-visible vs visible-after-write), `SET CONFIG` / `DELETE CONFIG`,
  `SET SECRET` / `DELETE SECRET`, plus policy DDL. reddb's own design doc states
  "New APIs should use the explicit Config and Vault surfaces."
- a **REST surface** — `GET`/`PUT /config/{key}`, `/auth/*` (tenants, users,
  api-keys), etc.

The RedClient in red-ui is a hand-rolled, data-plane-oriented HTTP client (memory
`client-not-reddb-io-client`). It already has a **query path**; it has **no**
config/secret/policy methods today. The earlier read-only `SettingsView` (#74)
deliberately omitted write/reset because the client had no authoring path — which
read as "reddb has no write endpoint". That framing was wrong about the _server_:
the endpoints exist on both surfaces. The real question is which surface red-ui
grows into.

The three stores have genuinely different semantics (ADR-aligned with the reddb
contract): **Config** reads plaintext; **Secret** reads masked `***` with a
separate server-gated break-glass reveal; **Policy** is RBAC/column/ops with its
own audit. The Settings surface presents them as one entry point with three
bounded panes (see `.red/CONTEXT.md`).

## Decision

- **Author and introspect via the SQL surface.** Config, Secrets, and Policies
  are all written through `SET CONFIG` / `SET SECRET` / policy DDL and read through
  `SHOW CONFIG` (and the equivalent secret/policy introspection statements),
  carried over the **query transport the RedClient already has**. No new per-key
  REST client is built.
- **The editor schema comes from the data, not a separate endpoint.** `SHOW
CONFIG` already returns value-type + `schema_version` per entry; the
  schema-driven renderer (the editable evolution of `settings-sections.ts`) drives
  controls off that, falling back to curated labels/descriptions/enums for human
  copy — the same registry idiom red-ui already uses, now editable.
- **Permission-awareness is orthogonal, via `POST /auth/can`.** A pane or control
  is rendered only when the principal holds the grant; when denied it is _absent_
  (red-ui's "permission-aware by default" principle), never disabled. Secrets stay
  masked unless the break-glass reveal action is granted.
- **One audited path.** Every authoring action lands as a statement on the query
  surface, so reddb's existing statement-level audit covers Config, Secret, and
  Policy writes uniformly.

## Consequences

- The RedClient grows a thin Config/Secret/Policy authoring module over its
  existing query path — not a second REST client. The "data-plane only" limitation
  in memory `client-not-reddb-io-client` is a property of today's client, not a
  blocker; that memory is corrected.
- The schema-driven editor needs no dedicated config-schema endpoint: `SHOW
CONFIG`'s value-type/`schema_version` is the schema source, with curated copy
  layered on top.
- Granular per-key REST (`/config/{key}`) is intentionally not used; if a future
  need (e.g. ETag/concurrency control per key) demands it, this ADR is revisited.
- A discovery slice (C0) validates the exact `SHOW CONFIG` projection, the secret
  reveal action name in the `action_catalog`, and the policy DDL shape against a
  live reddb before the editor slices are written; findings refine this ADR rather
  than reopen the surface choice.
- Secrets never reach the browser in plaintext except through the explicit,
  granted, server-audited reveal — consistent with the reddb vault contract and
  red-ui's "masked by default, audited reveal" stance.
