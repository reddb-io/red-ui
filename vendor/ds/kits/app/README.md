# Application Kit

The Kit every public Product Application receives (`kit.json` routes it to
`"*"`). It is the landing place for the Harvest: components brought in from the
applications, re-based on the DS Layers, and organized here (`.red/CONTEXT.md`).

## What is in it

Twelve Primitives, seeded from red-ui's `ui-kit` — six in the first Harvest
batch (issue #7) and six in the second (issue #8):

| Component        | What it is                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| `Button`         | The Kit's only control: three emphases, three sizes.                       |
| `Badge`          | A rectangular status marker that sits inside running text.                 |
| `Pill`           | A round-ended token — a filter, a tag — optionally dismissible.            |
| `Kbd`            | A key cap, or a chord rendered as one cap per key.                         |
| `Card`           | A bounded surface with optional header and footer sections.                |
| `SectionHeading` | A heading whose visual weight and outline depth are separate.              |
| `EmptyState`     | What stands where a list has nothing in it, plus the caller's own way out. |
| `ListRow`        | One row of a list, rendering the element its behavior calls for.           |
| `LoadingState`   | A spinner and the sentence beside it, which is what a screen reader gets.  |
| `NavItem`        | One navigation entry, which says where you are and does not only tint.     |
| `NodeBadge`      | A reddb node and whether the cluster can reach it.                         |
| `SplitView`      | Two panes and a divider movable by pointer or by arrow key.                |

Every one of them is a **Primitive**: it imports no other Kit component. That
is a mechanical property, not a judgement — `test/primitives.test.ts` reads the
imports and fails if one reaches for another. `SplitView` is the case worth
naming: it composes nothing, and the module it does import is its own
behavior, which is a `.ts` file and not a component.

## How a component is built

shadcn-svelte's split, in two files per component:

- `src/primitives/<name>.variants.ts` — one `tv()` call holding every class the
  component can wear, exported so a consumer can put the look on its own
  element without forking the component.
- `src/primitives/<Name>.svelte` — the element and its behavior, with
  `{...rest}` passing the platform straight through. No `<style>` block: a
  scoped stylesheet is a second styling source the Themes cannot reach.

A third file appears when a component's behavior is arithmetic rather than
markup — `src/primitives/<name>.behavior.ts`, as `SplitView` has. Everything
that can be decided without a DOM lives there and is tested without one; the
component keeps only the parts that need an element. The module is exported
too, so an application building a splitter of its own gets the same clamping
instead of writing the edges again.

## How it stays on-Brand

The Kit names colours and radii — `bg-primary`, `rounded-lg` — and never values.
Those utilities come from the Theme Layer's `@theme` surface and resolve to
`--reddb-*` custom properties, which is what lets one component render under
any Theme without knowing Themes exist.

`pnpm --filter @reddb-io/kit-app lint` enforces it. The vocabulary it checks
against is read from the generated artifacts, not restated: a colour must be
one the **base Theme declares**, not merely one the Tokens Layer ships. The
difference matters — `bg-neutral-900` resolves through a real token and is
still wrong here, because no Theme reassigns it, so a component wearing it
would look identical under base and dark. The showcase's per-component routes
are where you see that hold.

## How it answers to Density

Spatial values — control heights, insets, gaps — are named the same way, as
roles of the Density axis rather than as Tailwind steps: `h-8` compiles to a
fixed length, so a Kit written in steps is frozen against a density stop exactly
as a Kit written in hex would be frozen against a Theme. What a component wears
instead is a reference to the role:

```
h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)]
```

A stop reassigns those roles onto steps of the Brand's spacing scale (ADR 0003),
so the same component renders denser inside a `data-density="compact"` subtree
without knowing the axis exists. The neutral stop anchors every role at the step
the Kit already shipped, so adopting the axis moved nothing on screen.

Three things stay on Tailwind's own steps, and each is a decision rather than an
omission. **Type, radius and icon scale**, because density shrinks components,
not legibility — a `Kbd` cap is sized to the sentence it sits in, and a spinner
keeps the scale of the label beside it. **A width**, such as `SplitView`'s
divider, because the Brand ships no token family for widths at all. And **a
value the axis has no role at**: the axis ships three steps each of height,
inset and gap, and a Kit value that falls between them is left where it is
rather than pushed onto the nearest, which would move what the neutral renders.

The same `lint` enforces this half too. A spatial position the axis owns —
`h-*`/`min-h-*`/`max-h-*`, any padding, any gap — must name a role, and the lint
knows which steps are owned by reading where each role anchors under the neutral
stop: `h-9` compiles to 2.25rem, which is what `control-height-md` renders at,
so it is a violation, while `pt-1` is the same 0.25rem as `gap-sm` in a position
the axis ships no inset for and is left alone. An arbitrary value in one of
those positions holds a `--reddb-spatial-*` role or nothing: a raw length is the
same freeze spelled out, and `[var(--reddb-space-6)]` is a real token that no
stop reassigns. `test/fixtures/raw-spatial.variants.ts` is a component written
all four wrong ways, kept committed so the rule is known to fail; between it and
`test/density.test.ts`, where every routed value is pinned, a step the axis owns
cannot quietly come back.

## Consuming it

A Product Application receives this directory as vendorable Svelte 5 source via
`ds-sync` at a pinned DS release (ADR 0002), and imports from the Kit root:

```svelte
<script lang="ts">
  import { Button, Kbd } from "@reddb-io/kit-app";
</script>

<Button variant="secondary" size="sm">Search <Kbd keys={["Ctrl", "K"]} /></Button>
```

What lands is installable as it arrives: `ds-sync` rewrites the Kit's
`package.json` down to its runtime contract — `dependencies` and
`peerDependencies`, no workspace refs and none of the DS-internal scripts below
— and inlines the `extends` chain of its `tsconfig.json`, so neither file
reaches for anything outside the consumer tree (`scripts/producer/README.md`).

Tailwind must be told to scan the vendored Kit, since it lives outside the
consumer's own source tree — see `apps/showcase/src/app.css` for the
`@source` line the showcase uses.

The same file shows the stylesheets an application has to link. One of them is
newly load-bearing: **a density stop artifact must be linked**, or the roles the
Kit's spatial classes name resolve to nothing, the declarations are dropped, and
every control loses its height and inset. Linking
`@reddb-io/tokens/density-comfortable.css` alone is enough and changes nothing —
it is the neutral, declared at `:where(:root)`, which is what the Kit already
rendered at. Link the other two as well to let the application switch stops, and
declare the one it runs at in `data-density` on the root.

Because the Kit ships as source, the compiler that judges it is the consumer's.
`tsconfig.consumer.json` is that compiler's settings — strict, with no DS base
config behind it — and the `check` command runs the consumer's own
`svelte-check` against it over `src`. A component can compile, mount and pass
every test here while failing the first `svelte-check` it meets in an
application; this is what closes that gap (issue #50), and
`test/consumer-check.test.ts` runs it on every `test` so it cannot reopen.

## Commands

```
pnpm --filter @reddb-io/kit-app test    # component tests, the Primitive test, the lint's and check's own tests
pnpm --filter @reddb-io/kit-app check   # consumer svelte-check over the Kit's source, strict tsconfig
pnpm --filter @reddb-io/kit-app lint    # anti-hardcode lint over the Kit's source: colour, radius, spatial
pnpm --filter @reddb-io/kit-app build   # stage the vendorable source into dist/ for the release bundle
```
