# ADR 0009 — Ephemeral credentials in connection strings

Status: accepted
Date: 2026-10-22

## Decision

Core parses plain connection URIs and one UTF-8 Base64/Base64url layer through
one parser. Raw input is ephemeral. Only a sanitized endpoint becomes a
connection preset; URI username/password are exchanged with the database's
`/auth/login` and the session is installed through the existing provider seam.
Typed input, CLI deep links, and URL bootstrap use this same connection flow.
Conflicting credentials and session-token handoffs are rejected before connecting.

Open Contract `cs` accepts these forms in query or fragment. Fragment `cs`
precedes query `cs`; encoders put credential-bearing values in the fragment.
Bootstrap consumes and scrubs fragment credentials and tokens even if another
source wins precedence or validation fails. Legacy query input is sanitized.
Provider boot params expose only the non-secret endpoint. Invalid explicit
contracts report an error instead of falling back to a persisted database.

## Consequences

Base64 is an encoding and provides no confidentiality. Generated links must use
the fragment to avoid sending credentials to the UI host. Consumed links do not
automatically replay password login on refresh. Legacy query credentials may
reach the hosting server before the app can scrub them; the web shell sends no
referrer. Existing endpoint-only app-clients links remain compatible.

Browser transport reachability and the legacy 5055 HTTP bridge mapping remain
unchanged (ADR 0003). Hosted databases should use their published HTTPS endpoint,
not their native TCP RedWire connection string. This change does not introduce
platform SSO or retrieve plaintext passwords from app-clients.
