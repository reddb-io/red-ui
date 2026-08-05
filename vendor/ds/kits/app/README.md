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

## Consuming it

A Product Application receives this directory as vendorable Svelte 5 source via
`ds-sync` at a pinned DS release (ADR 0002), and imports from the Kit root:

```svelte
<script lang="ts">
  import { Button, Kbd } from "@reddb-io/kit-app";
</script>

<Button variant="secondary" size="sm">Search <Kbd keys={["Ctrl", "K"]} /></Button>
```

Tailwind must be told to scan the vendored Kit, since it lives outside the
consumer's own source tree — see `apps/showcase/src/app.css` for the
`@source` line the showcase uses.

## Commands

```
pnpm --filter @reddb-io/kit-app test    # component tests, the Primitive test, the lint's own tests
pnpm --filter @reddb-io/kit-app lint    # anti-hardcode lint over the Kit's source
pnpm --filter @reddb-io/kit-app build   # stage the vendorable source into dist/ for the release bundle
```
