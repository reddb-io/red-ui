# red-ui

Universal client for [reddb](https://github.com/reddb-io/reddb) — connect to embedded, server (TCP/TLS), Docker, or replicated clusters from one app.

Ships as both a desktop app (Tauri 2) and a PWA built from the same Svelte source.

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

```
red://user:pass@host:6379/main?role=primary
red+tls://cluster.reddb.io:443
red+unix:///var/run/reddb.sock
red+http://localhost:8080
```

## Launch from `red` CLI

The `red` CLI (in the main reddb repo) can launch this UI:

```sh
red ui red://localhost:6379/main
```

It resolves the matching release from `github.com/reddb-io/red-ui/releases`, caches under `~/.reddb/ui/<version>/`, and opens via deep link.

## License

Apache-2.0
