# Embeddable Lib isolates styles via Shadow DOM

The Embeddable Lib mounts the Core inside a Shadow DOM (Web Component wrapper) with its own encapsulated styles, so the host app's CSS can't leak in and the Core's Tailwind v4 preflight/utilities can't leak out. We chose this over scoped/prefixed CSS or "host's problem" because dropping the Core into an arbitrary host behind the host's own auth is only robust with real encapsulation.

## Status

accepted — pending a validation spike (see Consequences).

## Considered Options

- **Shadow DOM / Web Component (chosen)** — strong two-way isolation.
- **Scoped/prefixed CSS, preflight off** — lighter, same DOM, but leaks both ways.
- **Host responsibility / iframe** — bulletproof but it's a different integration model (not "import as a component"), so it doesn't serve the Embeddable Lib's purpose.

## Consequences

- **Spike required before committing the build:** Svelte 5 + Tailwind v4 + `bits-ui` inside a shadow root has known caveats — portalled popovers/dialogs, focus management, and element measurement. Validate these work (or are configurable to render within the shadow root) before locking the approach.
- The Desktop App and PWA Surfaces own the whole document and do **not** need Shadow DOM; this isolation is specific to the Embeddable Lib Surface.
