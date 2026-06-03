# @reddb-io/ui-kit

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
