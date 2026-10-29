# RedDB workspace host

This opt-in Product Surface composes App, Data and the RedDB adapter. It owns
PWA routing, embedded mounting, runtime orchestration and the temporary public
API compatibility facade. Database operations remain in the adapter; reusable
presentation remains in the Kits. No Kit imports this host.

Source harvested from Apache-2.0 red-ui, preserving its copyright and license.
`hosts: ["workspace"]` explicitly selects the host in Producer Sync. PWA and
embed builds share this source. The migration keeps the public package name and
entrypoints until their declared compatibility window expires.

Local checks: `pnpm --filter @reddb-io/ds-workspace-host check`, `test`, `build`.
Browser integration must use a disposable RedDB and both standalone and embedded
mounts. Copying this source alone does not retire legacy release workflows.
