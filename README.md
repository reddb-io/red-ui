# red-ui

Universal client for [reddb](https://github.com/reddb-io/reddb) — connect to embedded, server (TCP/TLS), Docker, or replicated clusters from one app.

Ships as both a desktop app (Tauri 2) and a PWA built from the same Svelte source.

## Stack

- **SvelteKit** + `adapter-static` — single bundle, deployable as PWA or wrapped by Tauri.
- **Tauri 2** — native desktop shell (Rust). Tiny binary, system webview, deep-link support.
- **@xyflow/svelte** — topology diagram with live primary/replica stats.
- **pnpm workspace** — `packages/ui` + `packages/ui-kit` (design system) + `packages/protocol` (red:// parser & client) + `apps/desktop` (Tauri).

## Layout

```
red-ui/
├── apps/
│   └── desktop/             # Tauri 2 shell (Rust)
└── packages/
    ├── ui/                  # SvelteKit app (PWA + Tauri frontend)
    ├── ui-kit/              # Design system (Svelte 5)
    └── protocol/            # red:// URI parser + TS client
```

## Develop

```sh
pnpm install
pnpm dev              # PWA at http://localhost:1420
pnpm desktop:dev      # Tauri desktop app
pnpm desktop:build    # bundle for current OS
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
