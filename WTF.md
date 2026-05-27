# WTF

Working notes from building the RedDB showcase in `red-ui`.

## VCS `AS OF COMMIT` includes branch-only rows

Repro from the current showcase seed:

1. `tale_taxonomy` is created with `ALTER TABLE tale_taxonomy SET VERSIONED = true`.
2. The seed commits the base rows.
3. The seed creates a branch, inserts `rapunzel`, and commits the branch.
4. `SELECT ... FROM tale_taxonomy AS OF COMMIT '<base_commit>'` still returns `rapunzel`.

That makes the SQL time-travel surface unsafe to showcase as a trusted before/after view right now. The UI uses `grimm_branch_diff` as a curated diff table instead of relying on `AS OF` snapshots.

## REST VCS diff is storage-level, not row-level

`GET /repo/commits/{from}/diff/{to}?collection=tale_taxonomy` works, but the payload looks like:

```json
{"change":"removed","entity_id":"203629","before":"entity#203629 xmin=186 xmax=235"}
```

For a product UI, this is not enough to explain that `cinderella.risk_score` changed from `2` to `1`. We need either a row/field diff endpoint or a documented recipe that maps entity ids back to logical rows and columns.

## Cuckoo filter catalog model is `mixed`

`CREATE FILTER grimm_seen_sessions` succeeds, but `red.collections` reports `model = "mixed"` instead of `filter`. A generic UI cannot infer the right read form from catalog metadata alone. `red-ui` now probes `HLL INFO`, `SKETCH INFO`, and `FILTER INFO` after `SELECT *` fails, but this is heuristic.

## Native vector collections do not expose the stored vector via `SELECT *`

`INSERT INTO motif_vectors VECTOR (...)` works and `VECTOR SEARCH` works. But `SELECT * FROM motif_vectors` returns metadata such as `content` and `dimension`, not the original `embedding` array. `red-ui` now previews vector collections by running a literal `VECTOR SEARCH` after sampling the dimension, but a first-class inspection query would be clearer.

## Native vector values currently hit a 1024-byte storage ceiling

`Xenova/all-MiniLM-L6-v2` produces 384-dimensional embeddings. Inserting those through the native vector endpoint fails with `Value too large: 1625 bytes (max 1024)`. A bare 240-dimensional vector succeeds, but the showcase also stores content and metadata, so the safe seeded shape is a normalized 224-dimensional projection of the 384-dimensional open-source model output until RedDB can store larger native vector payloads.

## Probabilistic structures use command-specific read forms

`SELECT * FROM grimm_unique_motifs` fails with a helpful message telling callers to use `SELECT CARDINALITY`, `FREQ(...)`, or `CONTAINS(...)`. The command forms (`HLL INFO`, `SKETCH INFO`, `FILTER INFO`) are easier for a generic UI to call, but the catalog does not expose the preferred read query per collection.
