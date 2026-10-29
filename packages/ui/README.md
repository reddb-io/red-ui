# @reddb-io/ui

Compatibility entrypoints for the Design System RedDB workspace. The package
ships the PWA, compiled embed bundle and CLI, plus the exact pinned DS source,
assets, receipt and licenses. It has no private-registry dependency.

Existing imports from `@reddb-io/ui`, `/embed`, `/renderers` and `/app.css`
continue to work. Source consumers of the DS can select the workspace host and
use `@reddb-io/design-system/hosts/workspace` with the same subpaths, replacing
`/app.css` with `/styles.css`.

Public facade support continues throughout 0.8.x. Removal requires an announced
breaking release no earlier than 0.9.0. Generic App/Data components remain
available independently of the RedDB host.
