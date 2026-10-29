# @reddb-io/ui-kit

## 0.7.19

## 0.7.18

## 0.7.17

## 0.7.16

## 0.7.15

## 0.7.14

## 0.7.13

## 0.7.12

## 0.7.11

## 0.7.10

## 0.7.9

## 0.7.8

## 0.7.7

## 0.7.6

## 0.7.5

## 0.7.4

## 0.7.3

## 0.7.2

## 0.7.1

## 0.7.0

### Minor Changes

- 610bf31: Give each mounted workspace independent connections, documents, drafts, staged edits, commands, appearance, renderer registrations and telemetry. Dispose its own queries, timers and subscriptions on unmount, and support simultaneous Shadow DOM mounts in the embed host.

  Keep published embed types usable in plain TypeScript hosts through the portable App Kit session entry and extensionless generated imports.

  **BREAKING:** mounted Workspaces now own their state. Hosts that controlled a Workspace through module-wide stores or window command events must create a `WorkspaceRuntime`, pass it to that mount and use its services and `dispatch`. Embedded handles expose their runtime. Persistence is private memory unless a mount supplies a `persistenceKey`; the standalone PWA keeps its existing profile and storage keys.

## 0.6.0

### Minor Changes

- 87af8f1: Adopt Design System command search, native linked workspace tabs, dialogs, connection forms and settings controls. Preserve query drafts, routing, credential locking and caller-owned mutation guards while using shared accessible focus and recovery behavior.

## 0.5.0

## 0.4.8

## 0.4.7

### Patch Changes

- 42b6e91: Update the officially vendored Design System from v2026.10.30 to v2026.10.38.
  Receive the latest Base/Application components, tokens and Brand assets while
  retaining complete font coverage for the application's symbols and weights.
  Update the Sync launcher for the producer's catalogue
  dependency so the pinned release can be reproduced from a fresh checkout.

## 0.4.6

## 0.4.5

## 0.4.4

## 0.4.3

## 0.4.2

### Patch Changes

- 19868ef: Sync the native Svelte Design System to v2026.10.30 through its official producer. Include SecretValue, WorkspaceTabs, ChangeReview, ErrorBoundary, ShortcutHelp, and the updated Button wrapping behavior.

## 0.4.1

## 0.4.0

## 0.3.6

## 0.3.5

### Patch Changes

- 43ca0cf: Adopt the pinned Svelte Design System through ds-sync, replace local primitive styling and duplicate palettes with DS components and tokens, and include the vendored DS in public npm artifacts without a private registry dependency.

## 0.3.4

## 0.3.3

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

## 0.3.1

## 0.3.0

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

## 0.1.1

### Patch Changes

- Publish the RedDB UI packages under the @reddb-io scope, add the red-ui CLI, expose the MCP App server, and deploy the standalone UI to GitHub Pages.
