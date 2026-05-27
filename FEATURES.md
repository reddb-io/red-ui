# red-ui feature dependencies on reddb

This file tracks reddb API/server work needed for the UI described by the product goal. red-ui should render real data only; missing backend features stay visible here instead of becoming mocked UI.

## Collection metadata and capabilities

- `GET /collections/:name` or equivalent metadata endpoint returning collection kind (`table`, `vector`, `graph`, `queue`, `kv`, `hypertable`, `stats`, `document`), schema, system columns, indexes, retention, tenant scope, and supported actions for the current user.
- red-ui now probes `GET /collections/:name` before falling back to `SELECT * FROM <name> LIMIT 1`. Expected fields: `name`, `kind`, `capability`, `capabilities`, `schema`, `indexes`, `retention`, `tenant`, `actions`.
- Capability should not require `SELECT * FROM <collection> LIMIT 1`; empty collections still need a type.
- Per-action authorization payload such as `can_select`, `can_insert`, `can_update`, `can_delete`, `can_run_algorithm`, plus denial reason.

## Query results

- Query responses should include stable result shape metadata for renderer selection, including graph result envelopes, vector dimensions, queue metadata, and stats units.
- Return server-side pagination/cursor data for large results.
- Return column types and primary key/system-column metadata so edits can generate correct update statements without heuristics.

## Vectors

- Expose vector collection metadata: vector column, dimensions, distance metric, index type, and materialized TurboVec scalar fields.
- Expose vector search/query operations with returned score/distance and metadata projection.
- Clarify how a materialized TurboVec scalar is named and how it maps back to the original vector.

## Queues

- Expose queue metadata: active consumer count, lease timeout, ack/nack counters, dead-letter collection/queue relationship, backlog depth, oldest message age.
- Add enqueue/dequeue/ack/nack/retry/dead-letter endpoints or document the SQL shape red-ui should call.
- Return message state, consumer/lease owner, attempts, visibility deadline, created/updated timestamps, and DLC pointer in a consistent schema.

## Graphs

- Expose graph metadata: vertex labels/types, edge labels/types, counts, and supported algorithms.
- Add documented graph-query/algorithm endpoints for neighborhood, shortest path, centrality, and traversal. Processing must stay in reddb; red-ui only submits the operation and renders the result.
- Document the exact `/query` grammar for graph algorithms such as `GRAPH SHORTEST_PATH`, including whether source/target are labels, ids, rids, or typed vertex references.
- Return graph results in a stable node/edge envelope so the frontend does not infer shape from row fields.

## KV

- Expose key prefix scan and pagination primitives.
- Return whether values are JSON, bytes, or scalar strings so red-ui can switch between key-value and JSON views without parsing guesses.

## Hypertables and statistics

- Expose time column, metric columns, retention, partition/bucket configuration, and preferred cohort buckets.
- Add server-side aggregation for writes per bucket (`1min`, `5min`, `10min`, etc.) with filters.
- Expose stats metric metadata: units, gauge thresholds, min/max, labels, and whether a metric is a counter, gauge, or rate.

## Cluster

- Expose `GET /cluster/status` returning deployment, storage, WAL, throughput, system, and replication telemetry. red-ui now probes this optional endpoint and falls back to `/stats` + `/replication/status` when it is unavailable.
- `/stats` should identify deployment mode: embedded file, direct server process, Docker container, or replicated server. Include file path/container id/image when available and safe to reveal.
- Expose storage capacity/used/free, WAL size, requests per second, reads per second, writes per second, average response time, and replication lag.
- Expose per-node connection counts and replica topology from the current node perspective.
- Return CPU and RAM usage, not only CPU core count and total/available memory.

## Security

- Expose `GET /auth/tenants` returning `{ ok, tenants }` for tenants visible to the current principal. Expected tenant fields: `id`, `slug`, `name`, current principal `role`, `grants`, `created_at`.
- Expose `GET /auth/users` with role/grant summaries filtered by the current principal. Existing red-ui client expects `{ ok, users }`.
- Expose `GET /auth/policies` returning `{ ok, policies }`. Expected policy fields: `id`, `name`, `tenant`, `principal`, `resource`, `action`, `effect`, `description`, `created_at`.
- Provide an endpoint for `auth.can(action, resource)` or batch authorization checks so red-ui can hide denied actions and show the required grant. Include denial reasons suitable for UI chips.
