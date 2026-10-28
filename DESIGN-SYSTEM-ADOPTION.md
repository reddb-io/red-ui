# Design System adoption

## Workspace consolidation: first runtime slice

DS ADR 0051 establishes the destination: retire the separate red-ui repository
after the workspace, RedDB adapter and PWA/embed/MCP/desktop delivery have
verified replacements. The App Kit's portable `createWorkspaceSession` owns
instance-local commands, an abort signal and deterministic cleanup. The present
Svelte workspace binds its services to that shared lifecycle. Extracting the
complete App workspace and its native React implementation remains a later
stage; this change does not declare that root component ready.

Every mount creates a `WorkspaceRuntime`. Connection/provider selection,
document identities, query drafts, staged edits, activity, loading, credential
state, appearance, renderer registrations and the developer console belong to
that instance. Child components obtain it through context. The root also owns
its portal destination and routes keyboard shortcuts from its own DOM scope.

```svelte
<script lang="ts">
  import { Workspace, createWorkspaceRuntime } from "@reddb-io/ui";
  const runtime = createWorkspaceRuntime({ connectionProvider });
</script>

<Workspace {runtime} initialRoute="/collections" />
```

Give simultaneous workspaces distinct `label` values. Embedded mounts expose
the same option; otherwise the provider's connection label names the region.
The standalone host owns the page's main landmark, while embedded workspaces
are named regions inside their host's document.

The Workspace owns disposal of its supplied runtime on unmount. Create a fresh
runtime for each mount. `runtime.dispatch("red:new-query")` replaces a window
event, and `runtime.queryTabs`, `runtime.tabs`, `runtime.connection` and
`runtime.pendingChanges` replace module singleton access for that mount. The
published module stores remain compatibility exports for standalone components.

Persistence defaults to private memory. An explicit `persistenceKey` selects a
profile whose history, preferences, vault and snapshots have distinct keys.
Use different keys for independent persisted workspaces. The reserved
`"default"` profile belongs to the standalone PWA and retains its old keys and
launch behavior. A profile's vault wipe enumerates only its own keys, including
when the legacy profile shares an origin with another workspace. Embedded
providers keep their existing host-owned authentication and no-history policy.

`mountRedUi` exposes the same runtime on its handle. Destroying or replacing a
mount aborts its derived HTTP client and queries, releases its session and
prevents delayed provider completions from reconnecting it. The host's supplied
client and other mounts stay usable. A custom provider retains ownership of its
own asynchronous work; the workspace refuses late adoption after disposal.
Console taps receive only that mount's owned HTTP traffic.

The embed-host example can add workspaces with separate provider instances and
remove them independently. Runtime and mounted-component tests cover colliding
document ids, independent drafts/edits/commands, profile storage, delayed
completion, executor routing and disposal. Real-browser checks additionally
exercise focus, portals, appearance and continued use of a surviving workspace.
SDK regression coverage includes concurrent and repeated mounts, stale handles
and closed shadow roots, with shortcuts routed inside their own root.
After building, `node scripts/check-package-types.mjs` stages the public packages,
verifies their copied DS bytes and compiles the staged SDK with the plain
TypeScript host configuration, without a Svelte compiler.

The Core uses the native Svelte implementation of the Design System through
`design-system.manifest.json` and the official `pnpm ds:sync` command. Keep the
release pinned and verify its receipt with `pnpm ds:check`. The full font profile
is intentional; a subset plus unsupported glyphs can download both font files.

## Shared contracts adopted in this wave

| Core composition           | DS contract                             | Responsibilities retained in red-ui                                              |
| -------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| Command palette            | App CommandPalette, dialog presentation | Global shortcuts, route targets, command actions                                 |
| Result documents           | App WorkspaceTabs, Base NavigationScope | Collection URLs, query identity, dirty-close decisions, result fetching          |
| Page headers               | App PageHeading                         | Page title, context and actions                                                  |
| Keyboard reference         | App ShortcutHelp                        | Shortcut registration and context descriptions                                   |
| Render recovery            | App ErrorBoundary with a fallback       | Diagnostics, artwork, retry and reload copy                                      |
| Credential lock            | Base Dialog, Field, Input and Button    | Encryption, unlocking, wipe confirmation, non-dismissible lock policy            |
| Connect                    | Base Popover and form controls          | Transport reachability, credential parsing, login and history                    |
| Staged edits               | Base Dialog, App ChangeReview           | SQL construction, grants, read-only guards, commit results and unstaging         |
| Settings                   | Base controls and AlertDialog           | Config/secret APIs, grants, masking, reveal expiry and key-specific confirmation |
| Initial collection loading | Base Skeleton                           | Request lifecycle, bounded viewport and silhouette selection                     |
| Tab actions                | Base DropdownMenu and controls          | New query and live-change actions, renderer overrides                            |

The DS enhancements belong upstream: modal command search, searchable metadata,
native tab links and Shadow DOM focus recovery are reusable contracts. Database
operations and the connection/provider model remain in the Core. Vendored source
is generated by Sync and is never the place to implement these enhancements.

Document identity, opening, focus and closing now use the framework-independent
App Kit workspace documents contract. The Svelte store still owns reactivity and
hydration; RedDB capabilities, persistence, dirty-close decisions and renderers
remain local. This is one step toward the shared workspace described in DS ADR
0051, not a migration of the whole workspace or its database adapter.

## Remaining adoption opportunities

| Priority | Opportunity                                     | Required evidence before migration                                                                                                       |
| -------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Next     | Renderer toolbar buttons, filters and selectors | Preserve selection, filter reset focus, keyboard access and permission gates                                                             |
| Next     | Data Kit Table                                  | Adapt record identities, staged cell edits, system columns, sorting, pagination and virtualization to the existing RedDB result contract |
| Next     | Data Kit CodeField                              | Preserve query drafts, completion sources, selection, execution shortcuts and error locations                                            |
| Later    | ChangeReview footer composition                 | A shared action-region seam would let a dialog compose Cancel beside batch actions while retaining per-item unstaging                    |
| Later    | Data charts and graph/document/queue viewers    | Compare actual capability coverage and runtime cost; validate data semantics and large results before replacing engines                  |

The Data Kit is not included in the current manifest. Introduce it through a
pinned Sync when a concrete renderer is ready to migrate. The local charts use
LayerChart 1.x while current DS charts use 2.x; that transition requires an
explicit adapter and browser validation.

A raw native-element count is not an adoption percentage: native controls can be
implementation details inside canonical DS components, and local ui-kit exports
already delegate several capabilities to the DS. Track concrete interactions and
public contracts, then validate the hosted PWA and Shadow DOM Embeddable Lib.

The workspace renderer registry now delegates its registration and resolution
rules to the portable App Kit contract. RedDB result types, Svelte components,
capability vocabulary and the table fallback policy stay in the client. The
shared registry does not implement renderer UI or the RedDB adapter.
