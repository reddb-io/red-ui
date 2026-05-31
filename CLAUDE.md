# red-ui

Universal client for [reddb](https://github.com/reddb-io/reddb) — connects to embedded, server, Docker, or replicated clusters. Ships as a desktop app (Tauri 2) and a PWA from the same SvelteKit bundle.

## Stack at a glance

- **SvelteKit** (Svelte 5 runes) + `adapter-static` — same bundle serves PWA and Tauri webview
- **Tauri 2** — Rust shell, deep-link handler for `red://` schemes
- **Tailwind v4** + `@tailwindcss/vite` + `tailwind-variants` + `bits-ui` — shadcn-svelte foundation
- **@xyflow/svelte** — topology canvas
- **lucide-svelte** — iconography
- **pnpm workspace** — `apps/desktop` (Tauri) + `packages/{ui,ui-kit,mcp}` under the `@reddb-io/*` scope

The UI HTTP adapter lives in `packages/ui/src/lib/reddb`. In browser it goes through a Vite middleware proxy at `/_red` (carries `X-Red-Target`) because reddb sends no CORS headers.

## Agent skills

### Issue tracker

GitHub Issues on `reddb-io/red-ui`. See `.red/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `.red/agents/triage-labels.md`.

### Domain docs

Single-context: `.red/CONTEXT.md` (TBD) + `.red/adr/` at the repo root. See `.red/agents/domain.md`.

## Design Context

### Users

Backend developers, SREs, and DBAs operating reddb clusters. They open red-ui to **inspect, query, and govern** a database they trust their production data to. Their context: between tasks, often with a terminal next to them, sometimes during an incident. They are technical, opinionated, and have seen every bad DB admin tool (phpMyAdmin, DBeaver, Antares, MongoDB Compass, Neo4j Browser). They will close anything that feels slow, cluttered, or condescending.

### Brand Personality

**Sharp · Surgical · Modern**

Vercel-coded: minimalist with conviction, surgical use of the accent red (`#ff2056`), zero ornament, contemporary type. Confidence without hype. Precision without coldness — there's still craft in the details (the splash animation, the pulsing role dots, the in-sync edge color).

Emotional goals on every screen:
- **Control** — actions are explicit, feedback is immediate, nothing is hidden behind submenus
- **Speed** — Cmd+K is the universal nav, no needless clicks, instant responses, optimistic UI where safe
- **Trust** — destructive actions confirm with diff, secrets are masked by default with audited reveal, every permission denial says *why*

### Aesthetic Direction

- **Dark only.** No light mode. Surfaces ramp from `--color-bg-0` (#050607, near-black with green tint) up through `bg-3`.
- **Surgical accent.** `--color-accent` (#ff2056) appears only in moments — primary actions, the central database in topology, active states. Never as decoration, never as background fill on large surfaces.
- **Type as hierarchy.** `Inter Variable` for UI, `JetBrains Mono Variable` for data, IDs, keys, code. Hierarchy comes from size + weight + mono-vs-sans, not from boxes and shadows.
- **References:** Linear, Vercel, Datadog, Cloudflare's service maps. Take the calm-but-dense data display from Datadog, the surgical accent from Vercel, the Cmd+K minimalism from Linear.
- **Anti-references:** phpMyAdmin (cluttered), DBeaver (Eclipse-era), Antares SQL (toy-app), MongoDB Compass (planet-of-tabs), Neo4j Browser (everything-is-a-row). Never feel like a "database admin tool from 2010". Never use saturated solid color blocks as primary UI elements (we made that mistake on day one and ripped it out).

### Voice

**Technical but human.** Use the database's vocabulary directly — `Drop table`, `Reveal secret`, `403 Forbidden`. But when an action is destructive or non-obvious, a tooltip or microcopy line adds the *why* in plain language: "This removes all rows permanently", "Auditied — your reveal at 14:32 was logged". Never explain what a developer already knows. Always explain what they couldn't infer.

### Accessibility

**WCAG AA** as the floor. Contrast ratios meet 4.5:1, keyboard navigation works end-to-end, ARIA where needed (forms, palettes, dialogs), `prefers-reduced-motion` respected on the splash and topology animations. No formal AAA audit, but no excuses for failing AA either.

## Design Principles

These hold across every page, component, and decision:

1. **The topology is the product.** The cluster canvas is the homepage. Every other view lives "inside" a node. The user's mental model is spatial, not hierarchical.

2. **Permission-aware by default.** Every action checks `auth.can(action, resource)`. If denied, the control isn't grayed out — it's *absent*, replaced by a small chip explaining the missing grant. The user never clicks something that will 403.

3. **Live or empty — never fake.** No mock data, no placeholder rows. If the connection is down, show an EmptyState with the command to fix it. If the data is real, show it with a "live" badge and the RTT. Honesty over polish.

4. **Cmd+K is the nav.** Sidebars are dev clutter. The palette is the primary navigation surface. Anything reachable by clicking should also be reachable by typing.

5. **Density before discovery.** Power users beat noobs. Default to compact rows, mono numbers, terse labels. Make data visible without scrolling. Reveal richer detail on hover or click, not on first paint.

6. **One accent, used sparingly.** `--color-accent` (#ff2056) marks ONE thing per screen: the primary action, or the selected item, or the active node. If two things compete for the accent, both lose.

## Working agreements

- **No mocks/fixtures.** Pages read from `connection.client` and fall back to `<EmptyState>` when unreachable. Don't reintroduce `fixtures.ts`.
- **No inline solid-color blocks** as primary surfaces (the day-one mistake). Use bordered cards with a colored stripe or pulsing dot to signal role/state.
- **No light mode** until explicitly requested. Dark tokens are the source of truth.
- **`<style>` blocks are OK** for component-local concerns, but prefer Tailwind utilities for layout, spacing, color, and typography so the design system stays inspectable from the class strings.
- **Never use saturated solid color fills** on large surfaces. Use `bg-1`/`bg-2`/`bg-3` for layers, accent only for emphasis.
- **Apostrophes inside `{...}` interpolated attribute values break the Svelte parser** when combined with backticks. Use JS template literals (`{`}message ${expr}{`}`}) instead of HTML strings when mixing both.

## Toolchain commands

```sh
pnpm install
pnpm --filter @reddb-io/ui dev                     # http://localhost:1420
pnpm --filter @reddb-io/ui build                   # static PWA → packages/ui/build
pnpm --filter @reddb-io/ui exec svelte-check       # type-check
pnpm --filter @reddb-io/ui test                 # vitest, including src/lib/reddb
pnpm --filter @reddb-io/ui-desktop tauri dev          # desktop app
pnpm --filter @reddb-io/ui-mcp start              # MCP App server over stdio

docker compose -f docker/compose.yml up -d       # primary :15055, replica :25055
./scripts/seed.sh http://localhost:15055         # seed primary
./scripts/embedded.sh                            # local file-backed reddb
```

## Known constraints

- Docker compose host ports are offset (15055/25055) because `flyctl proxy 5055:5055` may be running locally to tunnel into prod reddb. `red://localhost` in the Connect screen intentionally hits :5055 — that's the production tunnel.
- The reddb HTTP API does not send CORS headers. All browser fetches go through the Vite `/_red` proxy via `X-Red-Target`. Tauri opts out via `new RedClient(url, { proxyPath: '' })` and uses Rust-side fetch.
- The `tenant` field name is reserved by reddb's collection schema. Use `tenant_id` or `tenant_slug`.
- `/health` returns 503 with rich diagnostics under normal operation. Use `/stats` as the canonical proof-of-life.
- The 1.3.0 image requires `RED_HTTP_TLS_DEV=1` to skip TLS auto-cert refusal in plain-HTTP mode.
