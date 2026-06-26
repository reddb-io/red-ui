# @reddb-io/ui-mcp

## 0.3.1

## 0.3.0

## 0.2.0

### Minor Changes

- [#56](https://github.com/reddb-io/red-ui/pull/56) [`a7c6393`](https://github.com/reddb-io/red-ui/commit/a7c639358c79a52dc7f68859727fcbaebbcde9bb) Thanks [@filipeforattini](https://github.com/filipeforattini)! - The MCP App now opens a local `.rdb` `--read-only` when it is already held by
  another writer instead of failing on reddb's single-writer `flock` (ADR-0006,
  [#50](https://github.com/reddb-io/red-ui/issues/50)). When the caller does not pin a mode, `spawnLocalServer` opens read-write
  first and, if the `red server` child dies acquiring the lock, transparently
  retries with `--read-only`; reddb then reports `read_only` in `/stats` and the
  UI renders the existing read-only badge ([#23](https://github.com/reddb-io/red-ui/issues/23)). The trigger case is inspecting an
  agent's live memory `.rdb` while the agent is writing it. A file with no active
  writer still opens read-write, and an explicit `readOnly` is honoured verbatim
  with no fallback.

- [#57](https://github.com/reddb-io/red-ui/pull/57) [`e6a75a8`](https://github.com/reddb-io/red-ui/commit/e6a75a866ef4b17389dc26326b8c32d05212a895) Thanks [@filipeforattini](https://github.com/filipeforattini)! - MCP local-file mode now serves the Embeddable Lib bundle ([#37](https://github.com/reddb-io/red-ui/issues/37)) itself over
  `http://127.0.0.1:<port>` and points the embedded iframe there instead of the
  hosted HTTPS origin (ADR-0006, [#51](https://github.com/reddb-io/red-ui/issues/51)). The visual UI and the spawned `red server`
  then share an `http://` scheme, so there is no HTTPS→`http://localhost`
  mixed-content block (Chrome exempts localhost, but Firefox/Safari are
  unreliable) and a local session works fully offline. The host page imports the
  same-origin bundle and mounts red-ui through an `InjectedClientProvider` seeded
  from the `?cs=` endpoint. One embed server per MCP process, torn down with the
  local `red server` on disconnect/exit. The bundle directory is resolved from the
  installed `@reddb-io/ui` (overridable via `RED_UI_EMBED_DIR`); the `red-ui mcp`
  launcher passes it through. Remote mode is unchanged — it still loads the hosted
  UI and spawns nothing. The app resource's CSP now also allows loopback origins
  (`http://localhost:*`, `http://127.0.0.1:*`) for framing, scripts, and fetches.

- [#55](https://github.com/reddb-io/red-ui/pull/55) [`0b0ddbb`](https://github.com/reddb-io/red-ui/commit/0b0ddbb767c262bb45344ceab05d7b1028d76626) Thanks [@filipeforattini](https://github.com/filipeforattini)! - MCP App gains server-side data tools (`query`, `list`, `get`) that run a
  server-side `RedClient` in the MCP process against the resolved connection and
  return reddb reads to the model as `structuredContent` — the model reads data
  directly without driving the visual iframe (ADR-0006, [#49](https://github.com/reddb-io/red-ui/issues/49)). `query` is read-only
  (default-deny allowlist: SELECT/WITH/SHOW/EXPLAIN/DESCRIBE/MATCH; write/DDL is
  refused); `list` returns collection names or a collection's rows; `get` fetches a
  single record by id. Each tool resolves a remote endpoint per call (the tool's
  `connectionUrl`, else `RED_UI_CONNECTION_URL`); local-file targets are refused
  until the local-spawn slice ([#48](https://github.com/reddb-io/red-ui/issues/48)) lands. Auth comes from
  `RED_UI_CONNECTION_TOKEN`/`RED_UI_CONNECTION_AUTH` and is sent only as a request
  header — never logged, never returned in tool output (ADR-0005).

## 0.1.1

### Patch Changes

- Publish the RedDB UI packages under the @reddb-io scope, add the red-ui CLI, expose the MCP App server, and deploy the standalone UI to GitHub Pages.
