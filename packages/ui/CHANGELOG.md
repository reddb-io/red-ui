# @reddb-io/ui

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
