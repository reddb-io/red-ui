# ADR-0007: Settings authoring uses reddb's SQL query surface

The Settings surface reads and, in later slices, authors Config, Secrets, and
Policies through reddb SQL statements over the existing RedClient `query()` path.
The Core should not learn separate per-key REST config endpoints for this
surface.

## Decision

- Config reads use `SHOW CONFIG` over `POST /query`.
- Config writes/deletes in future slices should use the matching SQL config
  statements over the same query path.
- Secrets and Policies should appear as panes only when their real query-backed
  readers exist. Until then the Settings surface shows only Config.
- Permission checks remain orthogonal to the query surface and will be layered in
  through the server's auth capability surface when those panes ship.

## Projection Finding

Confirmed on 2026-06-04 against the repo's `docker/compose.yml` primary
(`ghcr.io/reddb-io/reddb:1.9.1`, `http://localhost:15055`) and against reddb
source:

- `SHOW CONFIG` returns a table projection with columns `key` and `value`.
- The live response had `statement: "show_config"`, `engine:
"runtime-config"`, `record_count: 109`, and `result.columns: ["key",
"value"]`.
- It does not currently project `value_type` or `schema_version`.
- `LIST CONFIG <collection>`, `GET CONFIG <collection> <key>`, and config write
  responses do project `value_type` and `schema_version`.

Source pointers:

- reddb `crates/reddb-server/src/runtime/impl_core.rs` handles
  `QueryExpr::ShowConfig` with `UnifiedResult::with_columns(vec!["key",
"value"])`.
- reddb `crates/reddb-server/src/runtime/impl_config.rs` projects
  `value_type` and `schema_version` for the explicit config CRUD/list path.

## Consequence

The Config pane parser accepts the confirmed live `SHOW CONFIG` shape and also
accepts enriched rows if reddb later adds `value_type` and `schema_version` to
`SHOW CONFIG`. Until that happens, the read-only control resolver falls back to
the runtime JSON value type for `SHOW CONFIG` rows and marks schema metadata as
unknown rather than fabricating it.
