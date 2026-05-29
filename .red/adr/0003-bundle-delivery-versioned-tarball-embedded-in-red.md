# 0003. Deliver the UI bundle as a versioned release tarball, embedded into `red`

## Status

Proposed

Date: 2026-05-29

## Context

One static bundle (ADR-0001) is consumed by three independent builds:

- **`../reddb`** (Rust) must embed the bundle so `red ui <file>` can serve it
  same-origin and offline. reddb embeds no static assets today.
- **`apps/desktop`** (Tauri) packages the bundle into the desktop app.
- **`ui.reddb.io`** (static host) deploys the bundle.

The release workflow already builds `packages/ui/build` and uploads it as the
`ui-bundle` artifact, with a placeholder job noting that publishing to the static
host and producing "the tarball consumed by reddb's build.rs" will be wired
"once rio-infra exposes the deploy target + credentials". reddb's CI is a Rust
toolchain; pulling the SvelteKit/pnpm toolchain into it to build the UI in-place
would be a significant burden and coupling.

## Decision

We will publish the built bundle as a **versioned release tarball**
(`red-ui-<version>.tar.gz`) from red-ui's CI on tag. Each consumer pins a version
and pulls the **same** artifact:

- reddb's `build.rs` downloads the pinned tarball and embeds it via
  `rust-embed` / `include_dir!`.
- the Tauri build consumes it as its frontend dist.
- the `ui.reddb.io` deploy publishes it to the static host.

The tarball — not a git submodule, not an npm dependency — is the cross-repo
interface.

## Consequences

- reddb's Rust CI never needs Node/pnpm/Vite; it depends only on a versioned
  artifact URL + checksum. Loosest possible coupling.
- A single immutable artifact guarantees all three Surfaces ship byte-identical
  UI for a given version — no "works in Tauri, broken embedded" skew within a
  release.
- Version pinning makes UI↔server API skew explicit and reviewable: bumping the
  embedded UI in reddb is a deliberate dependency bump, not an implicit retag.
- We must run a real release pipeline (versioning, checksums, retention) and the
  embed step adds the bundle's weight (~MBs) to the `red` binary.
- The deploy/publish half is blocked until rio-infra exposes a static-host
  target + credentials (tracked separately).

## Alternatives considered

- **Git submodule / vendored source.** reddb would build the UI itself, dragging
  the entire SvelteKit/pnpm toolchain into a Rust CI and coupling build graphs.
  Rejected.
- **Published npm package of built assets.** Natural for the pnpm workspace and
  for Tauri, but forces an npm fetch into reddb's Rust build and ties reddb to a
  registry. A plain tarball + checksum is toolchain-neutral. Rejected for the
  Rust consumer; npm may still back the JS-side consumers internally.
- **Each consumer rebuilds from source at its own pin.** Maximises flexibility,
  destroys the "byte-identical across Surfaces" guarantee and multiplies build
  cost. Rejected.
