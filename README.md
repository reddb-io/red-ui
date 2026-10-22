# red-ui

Universal client for [reddb](https://github.com/reddb-io/reddb) — connect to embedded, server (TCP/TLS), Docker, or replicated clusters from one app.

Ships as both a desktop app (Tauri 2) and a PWA built from the same Svelte source.

## Install

```sh
# Linux · macOS
curl -fsSL https://raw.githubusercontent.com/reddb-io/red-ui/main/install.sh | bash
```

```powershell
# Windows
irm https://raw.githubusercontent.com/reddb-io/red-ui/main/install.ps1 | iex
```

Detects your platform, downloads the matching release asset, and verifies its sha256 against the release's `checksums.txt`. Linux installs the `.deb` by default (`--appimage` for the portable single-file build); macOS gets the verified installer handed to it. Re-running the same one-liner upgrades in place — it's the update mechanism too. Remove with `uninstall.sh`.

Releases carry Linux x86_64 and aarch64, a universal macOS build, and Windows x86_64.

## Stack

- **SvelteKit** + `adapter-static` — single bundle, deployable as PWA or wrapped by Tauri.
- **Tauri 2** — native desktop shell (Rust). Tiny binary, system webview, deep-link support.
- **@xyflow/svelte** — topology diagram with live primary/replica stats.
- **pnpm workspace** — public packages under the `@reddb-io/*` npm scope, matching the main `reddb` repo release shape.

## Layout

```
red-ui/
├── apps/
│   └── desktop/             # Tauri 2 shell (Rust)
└── packages/
    ├── ui/                  # @reddb-io/ui — SvelteKit app + embeddable Svelte components
    │   └── src/lib/reddb/   # UI-only RedDB HTTP adapter, connection storage, and parser glue
    ├── ui-kit/              # @reddb-io/ui-kit — low-level design-system primitives
    └── mcp/                 # @reddb-io/ui-mcp — MCP App server
```

## Develop

```sh
pnpm install
pnpm dev              # PWA at http://localhost:1420
pnpm mcp              # MCP stdio server exposing the PWA as an MCP App
pnpm desktop:dev      # Tauri desktop app
pnpm desktop:build    # bundle for current OS
```

## MCP App

`@reddb-io/ui` is the primary UI package. It publishes the static standalone app
under `build/`, plus Svelte component exports from `src/lib`. The same static app
is deployed to https://ui.reddb.io from GitHub Pages on every push to `main`.
The `@reddb-io/ui-kit` package is versioned with it as the lower-level design
system surface. UI-only RedDB HTTP adapter code lives inside `@reddb-io/ui`
instead of being published as a separate protocol package.

It also ships the `red-ui` CLI:

```sh
npx @reddb-io/ui serve --open red://localhost
npx @reddb-io/ui open red://localhost
npx @reddb-io/ui mcp --stdio
```

## Open a database in the browser

The universal web client is https://ui.reddb.io. Open an HTTPS database endpoint
with the non-secret Open Contract parameters:

```text
https://ui.reddb.io/?cs=https%3A%2F%2Ffree.example.dbs.reddb.io&to=%2Fquery
```

`cs` targets the database HTTP API on port 443, independently of its RedWire
port. `to` selects the initial workspace route. The endpoint must have a valid
TLS certificate and permit browser CORS requests from the web client.

If the database requires authentication, expand **Sign in to the database** in
Connect and enter its username and password. Credentials are sent directly to
that endpoint's `/auth/login` over HTTPS (HTTP is accepted only for loopback
development). Redirects are refused. The resulting bearer session stays in
memory in the current tab; passwords and tokens are excluded from connection
history, browser storage, and the developer console. Credential launch links use
the URL fragment as described below. Failed
boot connections keep the supplied endpoint visible for sign-in or retry.

The Connect URL field also accepts `red://user:password@localhost` and
`reds://user:password@host`. Percent-encode special characters in credentials
(for example, `p%40ss` for `p@ss`). These aliases use the HTTP API on port 5055;
use `https://user:password@host:port` for a different HTTPS port. Inline
credentials are removed from the field before sign-in. Plain and Base64 strings
also work in Open Contract `cs`; generated credential links use `#cs=`. For
hosted databases, use their published HTTPS endpoint.

## Embeddable Lib

The Embeddable Lib ships from the existing `@reddb-io/ui` package as
`@reddb-io/ui/embed`. It registers or imperatively mounts a Shadow-DOM web
component around the same `Workspace` Mountable Root used by the PWA and
desktop app. The host owns auth by constructing a `ConnectionProvider` with an
already-authenticated client; in this mode red-ui hides its Connect flow and
does not persist credentials.

```ts
import {
  InjectedClientProvider,
  RedClient,
  mountRedUi,
} from "@reddb-io/ui/embed";

const client = new RedClient("https://reddb.example.com", {
  headers: { Authorization: `Bearer ${hostToken}` },
});

await mountRedUi(document.querySelector("#red-ui")!, {
  connectionProvider: new InjectedClientProvider({ client }),
  initialRoute: "/collections",
});
```

For a plain Vite/TypeScript host example, run:

```sh
pnpm --filter @reddb-io/ui build
pnpm --filter @reddb-io/embed-host dev
```

`@reddb-io/ui-mcp` exposes an `open_red_ui` MCP tool. The tool advertises the UI resource
`ui://red-ui/app.html` using the official MCP Apps MIME type
`text/html;profile=mcp-app`, then embeds the running red-ui web app in an iframe.

MCP clients can run the public package directly:

```json
{
  "mcpServers": {
    "red-ui": {
      "command": "npx",
      "args": ["-y", "@reddb-io/ui@latest", "mcp", "--stdio"],
      "env": {
        "RED_UI_APP_URL": "https://ui.reddb.io"
      }
    }
  }
}
```

For plugin manifests such as `red-skills/plugins/dev/.mcp.json`, use the same
public command:

```json
{
  "mcpServers": {
    "red-ui": {
      "command": "npx",
      "args": ["-y", "@reddb-io/ui@latest", "mcp", "--stdio"],
      "env": {
        "RED_UI_APP_URL": "https://ui.reddb.io"
      }
    }
  }
}
```

For local development only, run `pnpm dev` and override
`RED_UI_APP_URL=http://127.0.0.1:1420 pnpm mcp`.

The tool accepts an optional `connectionUrl` and `view`. When present,
`connectionUrl` is forwarded into the embedded web app as the `connection` query
parameter.

## Release

This repo uses Changesets like `reddb`:

```sh
pnpm changeset
pnpm release:version
git commit -am "Version packages"
git tag v0.1.1
git push origin main v0.1.1
```

The `release` GitHub Actions workflow runs on `v*` tags. It creates/updates the
GitHub Release assets and publishes public npm packages under the `@reddb-io/*`
scope with `pnpm release:publish`.

Required repository secret:

```text
NPM_TOKEN
```

## Connection strings

The Connect dialog and Open Contract `cs` parameter accept a plain connection
URI or its UTF-8 Base64 encoding. Standard Base64 and Base64url, with or without
padding, are supported; `base64:` and `base64url:` prefixes are optional.

```text
https://user:password@database.example
https://database.example
http://localhost:5055
```

Percent-encode reserved characters in usernames and passwords (for example,
`p@ss/word` becomes `p%40ss%2Fword`). The UI extracts URI credentials, signs in
through `/auth/login`, and uses the resulting session in memory. Remote password
sign-in requires HTTPS; HTTP is allowed for loopback development only. Secrets
are excluded from connection metadata, history entries, and the developer
console. Base64 is an encoding, not encryption.

To generate a browser launch link, URL-encode `cs` with `URLSearchParams`. Carry
credential-bearing strings in the **fragment**, which is not sent to the UI
hosting server:

```js
const cs = `https://${encodeURIComponent(user)}:${encodeURIComponent(password)}@database.example`;
const fragment = new URLSearchParams({ cs }); // Or UTF-8 Base64/Base64url(cs).
const href = `https://ui.reddb.io/?to=/query#${fragment}`;
```

`encodeOpenContract({ cs, to: "/query" })` follows this rule automatically.
`#cs=` takes precedence over `?cs=`. Credential-bearing `cs` and hash tokens are
consumed once and removed from the address bar; legacy query strings retain
only the sanitized endpoint. Plain endpoint-only links remain compatible:
`https://ui.reddb.io/?cs=https%3A%2F%2Fdatabase.example&to=%2Fquery`.

For browser connections, use the database's published **HTTPS endpoint** (443 by
default). Native TCP RedWire URIs on port 5050 are not browser endpoints.
Existing `red://`, `red+tcp://`, `red+wire://`, `reds://`, and `red+tls://` aliases
retain their HTTP bridge convention: port 5055, regardless of the native URI
port. `red+http://` / `red+https://` preserve their explicit HTTP port. Local
`file://`, `unix://`, and `red+unix://` targets remain Surface-dependent; browser
builds cannot open local files.

## Launch from `red` CLI

The `red` CLI (in the main reddb repo) can launch this UI:

```sh
red ui red://localhost:6379/main
```

It resolves the matching release from `github.com/reddb-io/red-ui/releases`, caches under `~/.reddb/ui/<version>/`, and opens via deep link.

## License

Apache-2.0

## Design System adoption

The Core vendors `reddb-io/design-system` through its official `ds-sync`
producer. `design-system.manifest.json` pins **v2026.10.29**, selects the native
Svelte flavor and the Application Kit (which inherits Base). The generated
`vendor/ds/design-system.receipt.json` records the revision and file hashes.

```sh
pnpm ds:sync   # requires the sibling ../design-system checkout and GitHub access
pnpm ds:check  # verifies the pin and every received file; also runs in CI
```

The Sync launcher runs the producer from the pinned release in a disposable
Design System worktree. It preserves the sibling checkout's branch and local
changes. Set `DESIGN_SYSTEM_PATH` to use a different checkout.

New shared controls import `@reddb-io/design-system/base` or `/app`.
`@reddb-io/ui-kit` remains a public compatibility facade: legacy tone names,
`Card.floating`, settings-row hint/wide/below slots, and heading icon/meta
slots delegate to DS primitives. The old NodeBadge role label composes a DS
Badge; it never invents reachability to match the DS NodeBadge status API.
The product EmptyState also delegates to the DS.

The Core declares `data-theme="application"`, a separate light/dark
`data-color-scheme`, and compact Density by default. The embed host may choose
its own Density. Both standalone and Shadow DOM consume the same DS CSS;
legacy layout color names reference DS roles instead of a second palette.
Brand fonts come from the vendored DS. Nocturne remains an explicit local
appearance extension; returning to Reddb restores the canonical DS cascade.
Database renderers, topology behavior, and connection/auth ownership remain
product-specific compositions.

Public npm source exports also carry their received DS files and assets. The
`prepack` step stages portable source imports and public runtime dependencies;
the private `@reddb-io/design-system` workspace package is never an npm
registry dependency. Standalone ui-kit consumers import
`@reddb-io/ui-kit/styles.css` from their Tailwind 4 entry stylesheet.
