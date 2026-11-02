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

Reload recovery is scoped by `persistenceKey`. Web connections retain only their
normalized endpoint and session token in tab-scoped `sessionStorage`; passwords
never persist. Explicit disconnect and workspace wipe clear recovery; unmount
preserves it for refresh. Host-injected providers keep ownership of authentication.
Durable snapshots retain documents and SQL drafts. Completed query results stay
in the tab cache, with a drafts-only fallback when browser storage is full or
blocked. Reload never replays SQL or resumes an in-flight query.

The standalone HTTPS web surface is installable as **RedUI** from the browser's
Install menu (on iOS: Share → Add to Home Screen). The manifest, normal/adaptive
icons and Apple touch icon come from the Assets Contract; host metadata opts in
through `host.json`'s `pwa` declaration. Sync materializes these exact assets in
its receipt, and the host build stages the same files without copying identity
by hand. Relative manifest URLs preserve installations below a base path. Install
identity defaults to the resolved start URL: a relative explicit `id` would be
resolved against the origin and collide between installations at different paths.

The service worker caches only versioned application files, install identity
and the static SPA fallback. It can reopen a deep link and recover SQL drafts
and tab-cached results without network access. Database requests still require
an available server: no API response, authentication header or queued mutation
enters the worker cache. A known connection survives offline startup and is
retried when the browser comes online, without replaying SQL.

Updates install in the background and wait until existing controlled windows
close; an in-use workspace is never forcibly reloaded. Native desktop and
embedded hosts do not register this worker. Local CLI hosting serves the
manifest with its manifest MIME type and the worker without HTTP cache reuse.

PWA browser gate: `node packages/workspace-host/tools/pwa-smoke.mjs` after build.
Set `PWA_APP_URL`, `PWA_DATABASE_URL`, `PWA_COLLECTION` and `PWA_EXPECT_ROWS` to
verify a deployed consumer against a real disposable database. The local gate
also stages a second worker revision and verifies it waits without reloading
an edited query. `PWA_BASE_PATH` supports a build made with `BASE_PATH`.
