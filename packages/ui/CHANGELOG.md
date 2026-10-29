# @reddb-io/ui

## 0.7.19

### Patch Changes

- e004d6f: Use the RedDB adapter for connection bootstrap and credential cleanup.
  - @reddb-io/ui-kit@0.7.19
  - @reddb-io/ui-mcp@0.7.19

## 0.7.18

### Patch Changes

- 58762ba: Use App Kit persistence for workspace snapshots.
  - @reddb-io/ui-kit@0.7.18
  - @reddb-io/ui-mcp@0.7.18

## 0.7.17

### Patch Changes

- e57f74f: Use App Kit storage isolation for independent workspace instances.
  - @reddb-io/ui-kit@0.7.17
  - @reddb-io/ui-mcp@0.7.17

## 0.7.16

### Patch Changes

- 6e2859b: Delegate RedDB configuration and secret authoring to the Design System adapter.
  - @reddb-io/ui-kit@0.7.16
  - @reddb-io/ui-mcp@0.7.16

## 0.7.15

### Patch Changes

- b6fd1e2: Use Design System KPI cards and table for statistics results.
  - @reddb-io/ui-kit@0.7.15
  - @reddb-io/ui-mcp@0.7.15

## 0.7.14

### Patch Changes

- 8e3d4d6: Use the Design System SettingsRow and SectionHeading directly for configuration and secret details.
  - @reddb-io/ui-kit@0.7.14
  - @reddb-io/ui-mcp@0.7.14

## 0.7.13

### Patch Changes

- ad7db0d: Use the Design System CodeBlock and shared JSON grammar for raw results, retaining exact JSON and adding an accessible copy action. Open JSON collection routes in the JSON renderer even when results are nonempty.
  - @reddb-io/ui-kit@0.7.13
  - @reddb-io/ui-mcp@0.7.13

## 0.7.12

### Patch Changes

- ef91241: Use the Design System Badge directly for cluster role labels.
  - @reddb-io/ui-kit@0.7.12
  - @reddb-io/ui-mcp@0.7.12

## 0.7.11

### Patch Changes

- 897c701: Use the Design System Data Kit table to display queue event envelopes while preserving queue commands, filtering and message insertion.
  - @reddb-io/ui-kit@0.7.11
  - @reddb-io/ui-mcp@0.7.11

## 0.7.10

### Patch Changes

- 9d11ee8: Use the Design System Data Kit DocumentViewer for document results while retaining RedDB body, fields, raw records, search and recovery.
  - @reddb-io/ui-kit@0.7.10
  - @reddb-io/ui-mcp@0.7.10

## 0.7.9

### Patch Changes

- 6d57884: Use the Design System Data Kit table for query results while preserving staged edits, filters, physical row identity and keyboard access.
  - @reddb-io/ui-kit@0.7.9
  - @reddb-io/ui-mcp@0.7.9

## 0.7.8

### Patch Changes

- 6118457: Use the Design System workspace change reconciliation and RedDB update adapter. Preserve edits made during a commit and target table updates by physical row ID after filtering or sorting.
  - @reddb-io/ui-kit@0.7.8
  - @reddb-io/ui-mcp@0.7.8

## 0.7.7

### Patch Changes

- 8e2257b: Use the Design System RedDB adapter for connection providers, transport contracts and permission decisions while preserving existing exports.
  - @reddb-io/ui-kit@0.7.7
  - @reddb-io/ui-mcp@0.7.7

## 0.7.6

### Patch Changes

- c8ab771: Use the Design System RedDB adapter for the HTTP client, CDC, diagnostics and response models while preserving existing exports.
  - @reddb-io/ui-kit@0.7.6
  - @reddb-io/ui-mcp@0.7.6

## 0.7.5

### Patch Changes

- e6d684c: Use the Design System's opt-in RedDB adapter for connection URI and Open Contract parsing while preserving existing exports.
  - @reddb-io/ui-kit@0.7.5
  - @reddb-io/ui-mcp@0.7.5

## 0.7.4

### Patch Changes

- 22abbc4: Use the App Kit workspace execution coordinator for query cancellation and stale-result protection.
  - @reddb-io/ui-kit@0.7.4
  - @reddb-io/ui-mcp@0.7.4

## 0.7.3

### Patch Changes

- fcb8807: Compose the collections workspace frame using the App Kit ApplicationWorkspace.
  - @reddb-io/ui-kit@0.7.3
  - @reddb-io/ui-mcp@0.7.3

## 0.7.2

### Patch Changes

- 5135d83: Use the App Kit's portable workspace renderer registry while preserving RedDB renderer selection behavior.
  - @reddb-io/ui-kit@0.7.2
  - @reddb-io/ui-mcp@0.7.2

## 0.7.1

### Patch Changes

- 4ea0cf5: Use the App Kit's portable document state for workspace tab identity and focus.
  - @reddb-io/ui-kit@0.7.1
  - @reddb-io/ui-mcp@0.7.1

## 0.7.0

### Minor Changes

- 610bf31: Give each mounted workspace independent connections, documents, drafts, staged edits, commands, appearance, renderer registrations and telemetry. Dispose its own queries, timers and subscriptions on unmount, and support simultaneous Shadow DOM mounts in the embed host.

  Keep published embed types usable in plain TypeScript hosts through the portable App Kit session entry and extensionless generated imports.

  **BREAKING:** mounted Workspaces now own their state. Hosts that controlled a Workspace through module-wide stores or window command events must create a `WorkspaceRuntime`, pass it to that mount and use its services and `dispatch`. Embedded handles expose their runtime. Persistence is private memory unless a mount supplies a `persistenceKey`; the standalone PWA keeps its existing profile and storage keys.

### Patch Changes

- Updated dependencies [610bf31]
  - @reddb-io/ui-kit@0.7.0
  - @reddb-io/ui-mcp@0.7.0

## 0.6.0

### Minor Changes

- 87af8f1: Adopt Design System command search, native linked workspace tabs, dialogs, connection forms and settings controls. Preserve query drafts, routing, credential locking and caller-owned mutation guards while using shared accessible focus and recovery behavior.

### Patch Changes

- Updated dependencies [87af8f1]
  - @reddb-io/ui-kit@0.6.0
  - @reddb-io/ui-mcp@0.6.0

## 0.5.0

### Minor Changes

- 8e6a683: Use the officially vendored Design System artwork for connection setup and
  recovery, locked and empty settings, first queries, query failures and workspace
  render crashes. Keep diagnostics and existing recovery behavior accessible, with
  connection actions respecting host-owned authentication in embeds. Invalid web
  routes now show an illustrated recovery page with a link back to the workspace.

### Patch Changes

- @reddb-io/ui-kit@0.5.0
- @reddb-io/ui-mcp@0.5.0

## 0.4.8

### Patch Changes

- 238a9f7: Use the pinned Design System's compact illustrations for empty table, graph,
  queue and document results. Distinguish filtered and unsupported results from
  empty data, keep query failures visible, and provide read-only recovery actions
  with keyboard focus restoration. Hidden queue messages no longer remain in the
  inspector when excluded by the current filter.
  - @reddb-io/ui-kit@0.4.8
  - @reddb-io/ui-mcp@0.4.8

## 0.4.7

### Patch Changes

- 42b6e91: Update the officially vendored Design System from v2026.10.30 to v2026.10.38.
  Receive the latest Base/Application components, tokens and Brand assets while
  retaining complete font coverage for the application's symbols and weights.
  Update the Sync launcher for the producer's catalogue
  dependency so the pinned release can be reproduced from a fresh checkout.
- Updated dependencies [42b6e91]
  - @reddb-io/ui-kit@0.4.7
  - @reddb-io/ui-mcp@0.4.7

## 0.4.6

### Patch Changes

- 7a75fc5: Open database sign-in fields on HTTP 401 and explain the credential requirement. Verify managed database credential handoffs through plain and Base64 Open Contract fragments.
  - @reddb-io/ui-kit@0.4.6
  - @reddb-io/ui-mcp@0.4.6

## 0.4.5

### Patch Changes

- 466a54f: Use the published HTTPS endpoint for managed RedDB database connection strings instead of the internal HTTP bridge port, including Base64-encoded strings. Preserve self-hosted port behavior and ephemeral credential handling.
  - @reddb-io/ui-kit@0.4.5
  - @reddb-io/ui-mcp@0.4.5

## 0.4.4

### Patch Changes

- 6fbb2aa: Use the official Design System RedDB Logo in the application navbar, with the correct light and dark marks and the existing home navigation behavior.
  - @reddb-io/ui-kit@0.4.4
  - @reddb-io/ui-mcp@0.4.4

## 0.4.3

### Patch Changes

- c9a8aec: Generate static HTML for fixed application routes and a client-side 404 fallback for dynamic collection URLs so direct visits and refreshes work on GitHub Pages.
  - @reddb-io/ui-kit@0.4.3
  - @reddb-io/ui-mcp@0.4.3

## 0.4.2

### Patch Changes

- 19868ef: Sync the native Svelte Design System to v2026.10.30 through its official producer. Include SecretValue, WorkspaceTabs, ChangeReview, ErrorBoundary, ShortcutHelp, and the updated Button wrapping behavior.
- Updated dependencies [19868ef]
  - @reddb-io/ui-kit@0.4.2
  - @reddb-io/ui-mcp@0.4.2

## 0.4.1

### Patch Changes

- f72c5fc: Adapt optional features to RedDB API capabilities independently of its version string. Support structured discovery and absent or unimplemented discovery routes through read-only probes while respecting explicit feature flags and authentication failures.
  - @reddb-io/ui-kit@0.4.1
  - @reddb-io/ui-mcp@0.4.1

## 0.4.0

### Minor Changes

- a7a767b: Accept plain and UTF-8 Base64/Base64url connection strings with URI credentials in
  Connect and URL bootstrap. Exchange credentials for an in-memory database session,
  keep connection metadata secret-free, and consume credential launch fragments.

### Patch Changes

- @reddb-io/ui-kit@0.4.0
- @reddb-io/ui-mcp@0.4.0

## 0.3.6

### Patch Changes

- 44269e7: Fix database sign-in from red:// and reds:// connection strings containing user:password. Decode inline credentials, exchange them for a session token, and keep credentials out of connection URLs and history.
  - @reddb-io/ui-kit@0.3.6
  - @reddb-io/ui-mcp@0.3.6

## 0.3.5

### Patch Changes

- 43ca0cf: Adopt the pinned Svelte Design System through ds-sync, replace local primitive styling and duplicate palettes with DS components and tokens, and include the vendored DS in public npm artifacts without a private registry dependency.
- Updated dependencies [43ca0cf]
  - @reddb-io/ui-kit@0.3.5
  - @reddb-io/ui-mcp@0.3.5

## 0.3.4

### Patch Changes

- 0a3a5ad: Support direct database username/password sign-in in the universal web client. Keep session credentials in memory, reject insecure remote login targets and redirects, and preserve failed Open Contract endpoints for retry.
  - @reddb-io/ui-kit@0.3.4
  - @reddb-io/ui-mcp@0.3.4

## 0.3.3

### Patch Changes

- f3f7046: Rename the desktop app's bundled RedDB sidecar so the Linux package can coexist with red-request.
  - @reddb-io/ui-kit@0.3.3
  - @reddb-io/ui-mcp@0.3.3

## 0.3.2

### Patch Changes

- Release binaries for every supported platform and publish them where installers can find them.

  Tags now build Linux x86_64 and aarch64, a universal macOS bundle, and Windows
  x86_64, and the release is published (not left as a draft) once every platform
  and the checksum job succeed — `/releases/latest` skips drafts, so nothing could
  install a tag before. `install.ps1` joins `install.sh` as the Windows one-liner.

  Also fixes the sidecar fetch, which pointed at a reddb release and asset names
  that do not exist, and `resolve_embedded_path`, which could not resolve a
  Windows `file:///C:/…` path or find the home directory on Windows.

- Updated dependencies
  - @reddb-io/ui-kit@0.3.2
  - @reddb-io/ui-mcp@0.3.2

## 0.3.1

### Patch Changes

- 0c8a198: Use `LIST KV` when previewing native key-value collections, so embedded red-ui can open legacy Red Request stores such as `rr_requests`.
  - @reddb-io/ui-kit@0.3.1
  - @reddb-io/ui-mcp@0.3.1

## 0.3.0

### Minor Changes

- [#82](https://github.com/reddb-io/red-ui/pull/82) [`b87d330`](https://github.com/reddb-io/red-ui/commit/b87d3305232c5087e330b72ae0e4cf3391b93650) Thanks [@filipeforattini](https://github.com/filipeforattini)! - Settings: per-section search + config export (PRD [#69](https://github.com/reddb-io/red-ui/issues/69), [#74](https://github.com/reddb-io/red-ui/issues/74)).

  The settings shell gains a focusable per-section search (⌘K idiom) that filters
  the data-driven registry within the active section by config key or human label,
  with **per-section query state** so switching sections preserves what you typed.
  The nav footer gains an **Export config** action that downloads the live config
  snapshot (read from `connection.client`) as JSON.

  Note: import/reset are intentionally not shipped — the reddb client exposes no
  config write/reset endpoint, so they would have no real target (the project's
  "live or empty, never fake" rule). Export reflects the read-only reality.

### Patch Changes

- Updated dependencies []:
  - @reddb-io/ui-kit@0.3.0
  - @reddb-io/ui-mcp@0.3.0

## 0.2.0

### Minor Changes

- Graph Phase 2 and the settings/appearance UI kit.

  Graph (PRD [#58](https://github.com/reddb-io/red-ui/issues/58)): community detection upgraded from Louvain to Leiden with a
  Louvain fallback for supply-chain safety ([#60](https://github.com/reddb-io/red-ui/issues/60)), group-in-a-box community layout
  ([#61](https://github.com/reddb-io/red-ui/issues/61)), edge bundling ([#62](https://github.com/reddb-io/red-ui/issues/62)), and supernode collapse/expand ([#63](https://github.com/reddb-io/red-ui/issues/63)) on the WebGL
  sigma renderer ([#59](https://github.com/reddb-io/red-ui/issues/59)).

  Settings & appearance (PRD [#69](https://github.com/reddb-io/red-ui/issues/69)): a routing-agnostic `SplitView` two-pane shell
  plus settings primitives — `ListRow`, `SectionHeading`, `Pill`, `NavItem`,
  `EmptyState`, `LoadingState` — in `@reddb-io/ui-kit` ([#70](https://github.com/reddb-io/red-ui/issues/70), [#72](https://github.com/reddb-io/red-ui/issues/72)); a data-driven
  settings section registry with a config-key resolver ([#73](https://github.com/reddb-io/red-ui/issues/73)); and a skin-as-data
  appearance registry with a color-mix surface ramp and dark-only preview cards
  ([#75](https://github.com/reddb-io/red-ui/issues/75)). The Core wires these through the Mountable Root router (`/settings`,
  `/appearance`) and the ⌘K command palette.

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

### Patch Changes

- Updated dependencies [[`a7c6393`](https://github.com/reddb-io/red-ui/commit/a7c639358c79a52dc7f68859727fcbaebbcde9bb), [`e6a75a8`](https://github.com/reddb-io/red-ui/commit/e6a75a866ef4b17389dc26326b8c32d05212a895), [`0b0ddbb`](https://github.com/reddb-io/red-ui/commit/0b0ddbb767c262bb45344ceab05d7b1028d76626)]:
  - @reddb-io/ui-kit@0.2.0
  - @reddb-io/ui-mcp@0.2.0

## 0.1.1

### Patch Changes

- Publish the RedDB UI packages under the @reddb-io scope, add the red-ui CLI, expose the MCP App server, and deploy the standalone UI to GitHub Pages.

- Updated dependencies []:
  - @reddb-io/ui-mcp@0.1.1
  - @reddb-io/ui-kit@0.1.1
