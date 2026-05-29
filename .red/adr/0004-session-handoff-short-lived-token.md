# 0004. Session handoff via a short-lived, target-scoped OIDC/JWKS token

## Status

Proposed

Date: 2026-05-29

## Context

From the reddb.io control plane a user clicks "open", and we offer **both**
"open in app" (the native `red://open?…` deep-link into the Standalone Surface)
and "open in browser" (`ui.reddb.io/?…`). The goal is to open red-ui *already
connected* to the chosen server, reusing the user's reddb.io identity.

A naive design would let the Web path lean on the `Domain=.reddb.io` cookie to
reach a managed server directly. We reject that (see Decision below): a
`.reddb.io` cookie is broadcast to every subdomain — including arbitrary nested
ones — so a cookie that grants *data-plane* access is a standing leak risk, and
the native path can't use a browser cookie at all. The session must cross app
and origin boundaries explicitly, and putting a durable credential in a URL or
process argv would leak a long-lived secret into shell history, logs, and
referrers.

This also interacts with ADR-0002: because the browser talks to the server
directly, whatever proves identity must be presentable by the client and
verifiable by the target server itself.

## Decision

We will have **reddb.io mint a short-lived, single-use, target-scoped token**
for the handoff, carried in the Open Contract (`token`, in the URL `#hash` on the
Web path so it never reaches a server log or referrer). The target server
verifies it against reddb.io's published **JWKS**:

- The **managed fleet** trusts reddb.io's issuer by default — handoff "just
  works" for bought databases.
- **BYO servers** can opt in by registering reddb.io as a trusted OIDC/JWKS
  issuer on their own server.

Targets that don't trust reddb.io (plain localhost, un-registered BYO) fall back
to that server's own authentication in red-ui.

**The `.reddb.io` cookie authenticates the control plane only** — it proves
reddb.io identity so the control plane can *mint* handoff tokens. It is never
presented to a data-plane server. Server access is **always** via the
short-lived token, uniformly for the Web and native paths. This removes any
broadly-scoped, data-granting cookie, so a leak to an untrusted `*.reddb.io`
subdomain cannot grant database access.

## Consequences

- Cross-repo dependencies: reddb.io needs a token-minting endpoint; `../reddb`
  needs JWKS-issuer verification. Both are coordination contracts.
- The handoff survives the cross-app jump (cookies can't) and the short TTL +
  single-use property bounds replay risk.
- reddb.io stays the single identity authority; servers verify offline via JWKS
  with no callback to reddb.io in the data path (consistent with no-gateway,
  ADR-0002).
- The "already connected" magic is **scoped**: automatic only where the target
  trusts reddb.io. We must make the manual-auth fallback for other targets a
  first-class, non-surprising path in the UI.
- Token-in-`#hash` and single-use semantics must be implemented carefully
  (consume-on-read, never persist, strip from history).

## Alternatives considered

- **Raw reddb.io session/credential in the deep-link.** Simplest, but leaks a
  durable secret via argv/URL/referrer. Rejected.
- **App performs its own OAuth login on launch.** Robust and standard, but
  discards the click-time context — the user re-authenticates instead of landing
  "already connected". Kept only as the fallback when no handoff token is
  trusted.
- **reddb.io gateway validates the token and forwards.** Removes per-server trust
  config, but reintroduces the central proxy rejected in ADR-0002 and puts our
  infra in the data path. Rejected.
