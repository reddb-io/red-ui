# 0002. Web Surface reaches reddb via a per-server CORS allowlist, not a central proxy

## Status

Proposed

Date: 2026-05-29

## Context

The Web Surface (`ui.reddb.io`, a statically-hosted PWA) must connect to "any
reddb the browser can reach" — a managed `*.reddb.io` server, a `localhost`
server spawned by `red ui --remote`, or a user's public k8s ingress. Two browser
realities constrain this:

1. **Reachability.** A hosted page can only talk to endpoints the *browser* can
   route to. A truly private reddb (k8s-internal, firewalled, plain localhost on
   another machine) is unreachable from a hosted page and from a reddb.io-side
   gateway alike. Those targets are the exclusive territory of the Embedded and
   Standalone Surfaces, whose process runs *inside* the reachable network.
2. **CORS.** reddb sends **no** CORS headers today. Even a managed
   `cluster.db.reddb.io` is cross-origin to `ui.reddb.io`. The existing dev
   workaround — a Vite middleware proxy at `/_red` — does not exist on a static
   host (e.g. Pages), so there is no same-origin proxy to lean on in production.

Browsers exempt `http://localhost` / `127.0.0.1` from mixed-content blocking, so
an `https` PWA *can* call a local reddb — but still only if that server returns
CORS headers for the `ui.reddb.io` origin.

## Decision

We will make CORS a first-class, configurable feature of the **reddb server**
(`../reddb`): an operator-set allowlist of trusted UI origins (defaulting to
`*.reddb.io` for the managed fleet, operator-extensible for BYO). The Web Surface
then calls the target reddb **directly** from the browser; no central proxy or
gateway sits in the data path.

The Web Surface's coverage is explicitly bounded to **browser-reachable**
servers. Unreachable/private servers are served by the Embedded or Standalone
Surfaces, by design.

## Consequences

- Cross-repo dependency: `../reddb` must implement and ship the CORS allowlist
  config. This ADR is a coordination contract with that repo.
- No proxy/gateway to operate, scale, or pay for; data-plane traffic stays
  browser↔server (lowest latency, our infra not in the hot path).
- Each server opts in to which UI origins may call it — security stays with the
  data-plane operator rather than being implicitly granted by a shared proxy.
- "Connect to any DB from the hosted UI" is **not** universally true and we must
  say so in-product: private targets surface an EmptyState pointing the user to
  `red ui` / the Standalone app instead of failing opaquely.
- Tokens/credentials travel from the browser to the server directly, so the
  session-handoff design (ADR-0004) must assume a browser-held credential.

## Alternatives considered

- **Central gateway/proxy at reddb.io.** Sidesteps CORS and hides servers from
  the browser, but cannot reach private targets either, adds latency and an
  always-on service we must run, and routes all customer data through our infra.
  Rejected for the direct-reach default; may return narrowly for specific
  managed scenarios later.
- **Edge proxy co-hosted with the static bundle** (`ui.reddb.io/_red`). Recreates
  the Vite proxy in production, but defeats the point of a static host and still
  funnels all traffic through one origin. Rejected.
- **Same-origin only** (UI served by each reddb server). Removes CORS entirely
  but kills the single canonical `ui.reddb.io` zero-install experience. Retained
  only as the Embedded Surface's mechanism, not for the Web Surface.
