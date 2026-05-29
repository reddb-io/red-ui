# red-ui

The universal client for reddb. A single static bundle delivered into several contexts, each pointed at a reddb instance with the right session before any screen renders.

## Language

**Connection Bootstrap**:
The boot-time resolution of which reddb to talk to and with what session, read automatically from whichever channel the current Surface provides.
_Avoid_: handoff, boot config, deep-link config

**Surface**:
A delivery context red-ui ships into — one of embedded, standalone, or web — all consuming the same static bundle.
_Avoid_: distribution channel, build target, mode

**Embedded (Surface)**:
red-ui vendored into the `red` binary and served same-origin by a `red ui <file>` subcommand against a local file, no auth, offline.
_Avoid_: local mode

**Standalone (Surface)**:
The installable Tauri desktop app (`apps/desktop`, `io.reddb.io`) — native window, `.rdb` file association, OS-keychain vault — kept alongside `red ui`, not replaced by it.
_Avoid_: desktop, native app

**Web (Surface)**:
red-ui hosted statically under `*.reddb.io` (canonically `ui.reddb.io`, possibly deeply nested like `x.y.z.reddb.io`), reached two ways: a control-plane deep-link that reuses the reddb.io session (cookie scoped `Domain=.reddb.io`), or a generic connect-anywhere entry via the `cs` param.
_Avoid_: PWA, hosted, cloud

**cs (param)**:
The `?cs=` URL parameter carrying the Connection Bootstrap target for the Web Surface — always a browser-reachable URL (e.g. `http://127.0.0.1:PORT`), never a filesystem path.
_Avoid_: connection string when it means a file path

**Open Contract**:
The shared parameter set both entry points use to open red-ui pre-configured: `cs` (target URL), optional `token` (short-lived handoff, carried in the `#hash` on web), and optional `to` (initial route/view). Same shape for the `red://open?…` deep-link and `ui.reddb.io/?…`.
_Avoid_: deep-link params, query string

**Session Handoff Token**:
A short-lived, single-use, target-scoped token minted by reddb.io so an app without the `.reddb.io` cookie (the native Standalone Surface, or any cross-app jump) can authenticate to a target; verified by the target via reddb.io's JWKS — trusted by the managed fleet by default, by BYO servers via opt-in issuer registration.
_Avoid_: session, credential, API key

## Relationships

- A **Surface** consumes exactly one static bundle; the same bundle serves all **Surfaces**.
- Every **Surface** feeds the bundle through the **Connection Bootstrap**; only the Bootstrap *source* differs per Surface.
- The **Embedded (Surface)** is the static bundle vendored into the `red` binary (cross-repo: ../reddb ships our build); `red ui <file>` serves it same-origin and offline by default, `--remote` instead opens the **Web (Surface)** with a `cs` pointing at the local server.
- A truly private reddb (k8s-internal, firewalled) is reachable only by the **Embedded** or **Standalone** Surfaces, never the **Web** Surface — browser reachability is the boundary.

## Flagged ambiguities

- "embedded" is overloaded: an **Embedded (Surface)** is how *red-ui* is delivered, distinct from reddb's *embedded deployment mode* (how the *database* runs). Same word, different layer.
- "connection string" / `cs` was used to mean a local file path (`?cs=/home/user/mydb.rdb`) — resolved: a hosted page cannot read a path, so `cs` is always a browser-reachable URL. Turning a file into a URL is the job of a local launcher (`red ui <file>`), not the Web Surface.
