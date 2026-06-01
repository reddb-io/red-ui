# Embeddable Lib isolates styles via Shadow DOM

The Embeddable Lib mounts the Core inside a Shadow DOM (Web Component wrapper) with its own encapsulated styles, so the host app's CSS can't leak in and the Core's Tailwind v4 preflight/utilities can't leak out. We chose this over scoped/prefixed CSS or "host's problem" because dropping the Core into an arbitrary host behind the host's own auth is only robust with real encapsulation.

## Status

accepted — validation spike passed on 2026-06-01.

## Considered Options

- **Shadow DOM / Web Component (chosen)** — strong two-way isolation.
- **Scoped/prefixed CSS, preflight off** — lighter, same DOM, but leaks both ways.
- **Host responsibility / iframe** — bulletproof but it's a different integration model (not "import as a component"), so it doesn't serve the Embeddable Lib's purpose.

## Consequences

- **Spike result:** go with Shadow DOM for the Embeddable Lib. The harness at `/shadow-dom-spike` mounts the `Workspace` Mountable Root plus a `bits-ui` popover/dialog into an open shadow root and runs browser-side checks for portals, focus, and measurement.
- **Portals:** working with configuration. `bits-ui` portals default to `document.body`; the Embeddable Lib must create an `HTMLElement` portal target inside the shadow root and provide it through `BitsConfig.defaultPortalTo` or per-portal `to`. `bits-ui` accepts `Element` targets, not `ShadowRoot` directly.
- **Focus:** working. Dialog focus remains inside the shadow root when dialog content is portalled to the internal portal target. Code and tests should inspect `shadowRoot.activeElement` for inner focus; browsers expose the shadow host as `document.activeElement`.
- **Measurement:** working. Floating UI/bits-ui popover measurement produced non-zero trigger/content rects inside the shadow root. Keep popover/dialog triggers and the internal portal target rendered as real layout elements; pass explicit collision boundaries later if the Embeddable Lib uses a clipped/scrolling container.
- **Styles:** working with a shadow-specific style injection step. The Embeddable Lib must inject the compiled Tailwind/app stylesheet into the shadow root and mirror theme tokens onto `:host`, because document-level selectors such as `html`, `body`, and `:root[data-theme='dark']` do not model an embedded shadow host.
- The Desktop App and PWA Surfaces own the whole document and do **not** need Shadow DOM; this isolation is specific to the Embeddable Lib Surface.
