# Red-ui presentation and workspace ownership

All production presentation and workspace implementation is maintained in the
Design System. The red-ui `packages/ui/src` and `packages/ui-kit/src` directories
contain only public export/style facades and SvelteKit ambient declarations.
There are no local components, routes, renderers, themes or workspace services.

| Responsibility                                                                                | Canonical owner                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Portable sessions, documents, commands, execution, storage and workspace frame                | App Kit workspace contracts and native Svelte/React adapters |
| Tables, key/value, event series, vectors, queue, graph, documents, JSON, diffs and statistics | Data Kit explorers and engines                               |
| Navigation, forms, charts, loading, recovery and positive/negative artwork                    | App/Data components composed from Base controls and assets   |
| HTTP, authentication, permissions, RedDB responses, queries and CDC                           | Explicit RedDB adapter                                       |
| RedDB workspace screens, routing, runtime, PWA and embedded mounting                          | Explicit workspace host                                      |
| CLI serving/opening and MCP delegation                                                        | Workspace host CLI                                           |
| MCP implementation                                                                            | Explicit MCP host                                            |
| Historical ui-kit prop/token contracts                                                        | Workspace host compatibility exports                         |

SvelteKit routes, library source, HTML template and static assets point directly
to `vendor/ds/hosts/workspace`. The embedded bundle uses the same source. The CLI
is a short invocation of the DS host with the public package's artifact folder.
The selected host composes App, Data and RedDB explicitly; importing a generic
App component does not pull in the database client, graph engines or Tauri.

## Public compatibility

Existing `@reddb-io/ui`, `@reddb-io/ui/embed`, `/renderers`, `/app.css` and
`@reddb-io/ui-kit` entrypoints remain supported. Their replacements are
`@reddb-io/design-system/hosts/workspace`, `/embed`, `/renderers`, `/styles.css`
and `/compat`, selected through official pinned Sync. Source consumers choose
`framework: "svelte"`, `kits: ["data"]`, `adapters: ["reddb"]`,
`hosts: ["workspace"]`, `styles: ["application"]`.

The facades remain supported throughout 0.8.x. Removal requires an announced
breaking release no earlier than 0.9.0 and verified migration guidance.
Public npm artifacts include the exact selected DS source, receipt, assets and
Apache-2.0 licenses, with no dependency on a private registry.

## Enforced evidence

- `ds:check` verifies every vendored byte against the official receipt.
- `ds:audit:strict` rejects any source implementation in the public facade
  directories, including new components, routes, scripts or CSS declarations.
- The DS host separately audits its production composition against canonical
  controls; the intentionally hostile Shadow DOM fixture is its only exception.
- All 627 runtime/interaction tests execute against the vendored host source.
- Svelte checking, PWA/embed builds and a plain TypeScript SDK consumer pass.
- Real disposable RedDB browser journeys cover all six result explorers,
  filters, query recovery and graph algorithms. Mobile/desktop light/dark error
  states have no axe violations or horizontal document overflow.
- Two embedded workspaces keep independent drafts; the second still queries
  the real server after the first is unmounted.
- Staged public packages preserve all DS receipt hashes and licenses.

## Distribution boundary

The public red-ui repository still provides package/installer publication,
Pages hosting, version metadata and the native Tauri shell. These are delivery
responsibilities, not a parallel component system. Desktop uses the same built
DS workspace. Archiving the repository is a later, distinct operation under
DS ADR 0051: it requires migrating release infrastructure and satisfying the
published facade window. Source/UI absorption does not claim that retirement.
