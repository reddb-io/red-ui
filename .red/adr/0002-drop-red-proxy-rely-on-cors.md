# Drop the `/_red` proxy; rely on reddb server CORS

The Core talks to reddb directly from the browser, relying on the server's CORS headers (shipped in reddb **1.9.1**: `Access-Control-Allow-Origin: *`, `OPTIONS → 204` before auth, no `Allow-Credentials` since auth is `Authorization`/API-key, never cookie). We remove the `/_red` proxy entirely — both `shouldProxy()`'s browser default in `packages/ui/src/lib/reddb/client.ts` and the `redProxy()` middleware in `packages/ui/vite.config.ts`.

## Context

The `/_red` proxy existed only because pre-1.9.1 reddb sent no CORS, so cross-origin browser fetches were blocked. It was a **Vite dev-server middleware** — it never existed in the `adapter-static` production build, so prod browser connections to non-CORS servers were always broken. Keeping it bought nothing in prod and created a dev-vs-prod divergence that *masked* the real dependency (server ≥1.9.1).

## Consequences

- A browser Surface can only reach a reddb endpoint that sends CORS, i.e. server **≥1.9.1**. There is no client-side workaround for older servers (the Desktop App is exempt — it fetches Rust-side, no CORS).
- `docker/compose.yml` is bumped from `reddb:1.3.0` to a ≥1.9.1 image in the same change so `pnpm dev` keeps working against the local stack.
- Deploying a browser Surface against reddb requires the server to be ≥1.9.1 first; the infra Dockerfile (FF/palgeon) must bump `@reddb-io/cli` to ≥1.9.1 and rebuild. This ADR does not cover that infra repo.
