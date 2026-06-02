# MCP App: remote targets connect directly; local files are served by a spawned `red server`

The MCP App resolves its target into one of two modes. A **remote** target (an
`http(s)://` or `red://` URL) is handed to the browser Surface as-is via the
Open Contract — the UI fetches it directly (reddb CORS). A **local file** target
(a filesystem path / `file://` / `*.rdb`) cannot be reached by a browser at all,
so the MCP process **spawns `red server --http-bind 127.0.0.1:<ephemeral> --path
<file>`** as a child, health-checks it, and hands the UI `?cs=http://127.0.0.1:<port>`.

## Status

accepted — local-file path implemented by #48 (`packages/mcp/src/local-server.ts`,
`target-mode.ts`), merged via PR #54 on 2026-06-02; lock-aware `--read-only`
fallback implemented by #50 (`spawnLocalServer` opens read-write, then retries
`--read-only` when reddb dies on the single-writer `flock`). Remaining PRD #19
slices: #49 (server-side data tools), #51 (same-origin embeddable bundle). The
"Today `packages/mcp` is a pure display proxy" framing in Context below is the
historical state at authoring time, kept as the decision's _why_.

## Context

The browser sandbox has no usable filesystem API for an `.rdb`, and cannot speak
reddb's native RedWire/TCP (`red://` = TCP :5050). reddb's embedded mode is
in-process Rust (`RedDB::open`) with no stdio/HTTP bridge, and **no `red ui
<file>` command exists** (PRD #19 assumed ../reddb would build one; it has not).
Therefore any browser Surface that inspects a file needs an HTTP server in front
of that file. reddb already _is_ that server: `red server --path <file>
--http-bind …` opens the file and exposes the full HTTP API + CORS (≥1.9.1). The
MCP process (Node) cannot open the `.rdb` itself (Rust-only embedded), so it
spawns the `red` binary rather than reimplementing the HTTP API.

Today `packages/mcp` is a pure display proxy: it renders an `<iframe>` at
`RED_UI_APP_URL` (default `https://ui.reddb.io`) and connects to no reddb itself.
Local-file support and any server-side data access are new capability.

## Decision

- **Mode detection** lives in the MCP process. URL-shaped target → remote;
  filesystem/`file://`/`*.rdb` → local. The Core stays unchanged — it only ever
  receives a connection string through the Open Contract (ADR-0001, ADR-0005).
- **Remote:** pass `?cs=<url>` (+ managed-session token via the handoff channel,
  ADR-0005 / #27). No process is spawned. Optionally the MCP process runs a
  server-side `RedClient` to answer data tools (`query`/`list`/`get`) as
  `structuredContent`, so the model gets data without driving the visual iframe.
- **Local file:** spawn **one** `red server --http-bind` that **owns** the file;
  both the visual UI and any MCP data tools talk to it over `http://localhost`.
  One owner because reddb's `flock` is single-writer — we must not open the file
  from two processes. Spawn requires a `red` binary (via `@reddb-io/sdk`'s
  subprocess or a PATH `red`); resolve-or-fail explicitly, never reimplement the
  API as a Node↔SDK HTTP proxy.
- **Lock-aware:** if the file is already held by another writer (the trigger
  case — viewing an agent's live memory `.rdb`), spawn with `--read-only`; reddb
  reports `read_only` in `/stats` and the UI already renders the badge (#23).
- **Same-origin local UI:** for the local mode, serve the Embeddable Lib bundle
  (#37) on `http://localhost` too, so the iframe and the API share an
  `http://localhost` origin — avoids HTTPS→`http://localhost` mixed-content
  (Chrome exempts localhost; Firefox/Safari are unreliable) and works offline.
- **Lifecycle:** spawn on demand, wait for `/stats` healthy, tear the child down
  on MCP exit/disconnect; pick an ephemeral port.

## Consequences

- The MCP App gains a hard dependency on a `red` binary for the local-file path
  (acceptable: it is the database we are a client of). The remote path keeps zero
  binary dependency.
- "Open this file in the UI" no longer waits on a `red ui <file>` subcommand in
  ../reddb — the MCP owns the embedded-surface story for its App.
- Two processes never write one `.rdb`: a local session is one `red server` that
  both the UI and the model-facing tools share.
- Secrets still never ride the URL (ADR-0005 holds for the remote token path).
