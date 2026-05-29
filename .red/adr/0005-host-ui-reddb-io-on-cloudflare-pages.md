# 0005. Host `ui.reddb.io` on Cloudflare Pages, DNS managed by rio-infra

## Status

Proposed

Date: 2026-05-29

## Context

The Web Surface (ADR-0001) needs a canonical static host at `ui.reddb.io`. Two
facts shape the choice:

- **rio-infra** (`rdb-infra`) is a Terragrunt + **Cloudflare** stack: it owns the
  `reddb.io` Cloudflare zone and every DNS record (`www`, `app.reddb.io`, …),
  plus R2 buckets and Turnstile. CI has `CLOUDFLARE_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID`. There is **no `ui.reddb.io` record today**.
- **red-ui's** `release.yml` already builds the embeddable bundle (`BASE_PATH=''`)
  and ships `red-ui-<tag>-web.zip`. Its `pwa-pages` (GitHub Pages) job is stubbed
  and disabled; a placeholder notes the static-host publish is blocked "once
  rio-infra exposes the deploy target + credentials".

The deploy target does not exist yet; this ADR picks it.

## Decision

Host `ui.reddb.io` on **Cloudflare Pages**. red-ui's release workflow deploys the
built bundle to a Cloudflare Pages project; **rio-infra** owns the `ui.reddb.io`
DNS/custom-domain binding in the `reddb.io` zone (Terragrunt), consistent with how
every other reddb.io record is managed.

## Consequences

- Hosting stays native to the rio-infra Cloudflare stack: same provider, same
  account, CDN + SPA fallback + preview deploys out of the box, one zone of
  truth for DNS.
- Cross-repo wiring required:
  - **red-ui**: add a Pages deploy step (e.g. `cloudflare/wrangler-action`) to
    `release.yml`; needs a scoped Cloudflare API token + account id as repo
    secrets. The bundle must be built with the **root** `BASE_PATH=''` for a
    dedicated host (the `/red-ui` subpath build is GitHub-Pages-specific and is
    no longer the target).
  - **rio-infra**: add the `ui.reddb.io` DNS record / Pages custom-domain binding
    in the `reddb.io` zone via Terragrunt.
- The disabled `pwa-pages` GitHub Pages job in `release.yml` is superseded and
  should be removed to avoid two competing hosts.
- CORS allowlists on reddb servers (ADR-0002) must include the final
  `ui.reddb.io` origin, and the `.reddb.io` cookie scope (ADR-0004) must account
  for `ui.reddb.io` being a sibling of `app.reddb.io`.

## Alternatives considered

- **R2 bucket + Cloudflare (public bucket / Worker).** Reuses existing R2 modules
  and credentials, but SPA routing, cache headers, and the fallback-to-index
  behaviour must be hand-built (Worker or redirect rules). More moving parts than
  Pages for a SPA. Rejected as the default.
- **GitHub Pages + CNAME.** Finishes the already-stubbed `pwa-pages` job with the
  least Cloudflare-side work, but fragments hosting off the primary provider,
  splits TLS/CDN/observability away from the zone rio-infra manages, and keeps
  the `/red-ui` subpath quirk. Rejected.
