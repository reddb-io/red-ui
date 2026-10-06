# Application Kit

The Kit every public Product Application receives (`kit.json` routes it to
`"*"`). It is the landing place for the Harvest: components brought in from the
applications, re-based on the DS Layers, and organized here
(`.red/contexts/component-system/CONTEXT.md`).

## What is in it

Five **Primitives**, seeded from red-ui's `ui-kit` in the first two Harvest
batches (issues #7 and #8):

| Component        | What it is                                                  |
| ---------------- | ----------------------------------------------------------- |
| `Pill`           | A round-ended token — a filter, a tag — optionally dismissible. |
| `ListRow`        | One row of a list, rendering the element its behavior calls for. |
| `NavItem`        | One navigation entry, which says where you are and does not only tint. |
| `NodeBadge`      | A reddb node and whether the cluster can reach it.           |
| `SplitView`      | Two panes and a divider movable by pointer or by arrow key.  |

…and thirty-one **Composites**, including the canonical application frame and column
arrangements, command surfaces, titling surfaces, refinement controls, social surfaces,
commerce surfaces, commerce catalogue contracts, comparison, and merchandising contracts:

| Component      | What it is                                                    |
| -------------- | ------------------------------------------------------------- |
| `ContextMenu`  | Pointer and keyboard context commands over canonical menu rows. |
| `CommandPalette` | Global caller-owned command search composing canonical Popover and Combobox focus. |
| `Menubar`      | Top-level application commands with roving focus and menus.     |
| `SidebarNavigation` | A vertical destination list with exactly one announced current item. |
| `SidebarRail`  | A compact workspace rail of Tooltip-labelled controls with roving focus and a caller-owned selection. |
| `BottomNavigation` | A compact, keyboard-reachable destination bar with consumer-owned placement. |
| `StoreNavigation` | A store masthead composing the canonical Base Navbar around caller-owned regions. |
| `ApplicationShell` | Keyboard bypass, product chrome, and one focusable main landmark. |
| `MultiColumnLayout` | Two or three caller-owned responsive columns in stable document order. |
| `SidebarLayout` | A named complementary landmark beside one main landmark, on either edge. |
| `SpeedDial`    | A canonical Button revealing related actions in a Popover.      |
| `Toolbar`      | A named row or column of controls with one roving tab stop.      |
| `PageHeading`  | The page's one `h1`, with caller-owned context and actions.       |
| `CardHeading`  | A compact canonical SectionHeading for a card header.             |
| `ActionPanel`  | A named Card pairing caller content with associated actions.      |
| `ProductList`  | A named responsive collection of canonical product cards.          |
| `ProductOverview` | Product identity and media with caller-owned detail and purchase controls. |
| `ProductFeature` | A product story over canonical media, heading, and flow contracts. |
| `ProductQuickview` | Product detail inside the canonical Dialog focus lifecycle.     |
| `Filter`       | One named active filter composed from the canonical ToggleGroup.  |
| `CategoryFilter` | Named multi-select categories composed from Fieldset and Checkbox. |
| `Diff`         | Caller-computed change rows, inline or side by side in a resizable SplitView. |
| `CategoryPreview` | A visibly named category destination over canonical Card, AspectRatio, and Link. |
| `Incentive` | A named value proposition over canonical MediaObject and SectionHeading. |
| `ActivityFeed` | Ordered application activity composed from the canonical Timeline. |
| `ChatMessage` | Authored conversation composed from MediaObject and Avatar. |
| `Review` | A scored authored review composed from Card, MediaObject, Avatar, and Rating. |
| `CheckoutForm` | Caller-owned checkout groups bound through canonical Form, Fieldset, Field, and Input. |
| `ShoppingCart` | Native quantity and removal controls, optional caller-owned item media, and a politely announced total inside Form. |
| `OrderSummary` | A named Card of caller-owned amounts, total, and actions. |
| `OrderHistory` | A captioned, keyboard-scrollable native table of caller-owned order facts. |

The split is mechanical, not a judgement: a Primitive imports no other Kit
component and a Composite composes at least one, and `test/taxonomy.test.ts`
reads the imports and decides. It checks both directions — a component under
`src/primitives` that reached for another is in the wrong place, and so is one
under `src/composites` that composes nothing — so the directory is a claim and
the imports are the fact.

`SplitView` is the case worth naming on the Primitive side: it composes
nothing, and the module it does import is its own behavior, which is a `.ts`
file and not a component. Universal command menus and mastheads live in Base
as `DropdownMenu` and `Navbar`; this Kit receives both through its parent edge
without retaining same-named local sources, exports, or catalogue entries.

Loading feedback is universal rather than application-directional. The former
`LoadingState` contract now lives canonically in Base as `LoadingIndicator`,
which this Kit receives through its parent edge without shadowing the name or
behavior locally.

The generic zero-data surface follows the same boundary. `EmptyState` now
lives canonically in Base, and Application receives it through inheritance
without retaining a local source, export, or catalogue entry.

## How a component is built

shadcn-svelte's split, in two files per component:

- `<name>.variants.ts` — one `tv()` call holding every class the component can
  wear, exported so a consumer can put the look on its own element without
  forking the component.
- `<Name>.svelte` — the element and its behavior, with `{...rest}` passing the
  platform straight through. No `<style>` block: a scoped stylesheet is a
  second styling source the Themes cannot reach.

A third file appears when a component's behavior is arithmetic rather than
markup — `<name>.behavior.ts`, as `SplitView` and the command surfaces have.
Everything that can be decided without a DOM lives there and is tested without
one; the component keeps only the parts that need an element. The module is
exported too, so an application building a splitter of its own gets the same
clamping instead of writing the edges again.

## How behavior enters

Managed focus is not something a Kit should write twice, so it does not write
it at all: **Bits UI** is the Composites' behavior base (ADR 0005) — the
headless Svelte 5 layer shadcn-svelte itself builds on. It brings the roving
tab stop, the wrapping arrows, typeahead, Escape, Tab-out, the ARIA roles and
the positioning; the DS brings the appearance, through the same `tv()` call
over the same Theme utilities and Density roles a Primitive uses.

The seam between the two halves is Bits' `child` snippet, which hands back the
props for an element and lets this Kit render it:

```svelte
<Bits.Trigger>
  {#snippet child({ props })}
    <Button {...props} {variant} {size}>{label}</Button>
  {/snippet}
</Bits.Trigger>
```

That is the whole recipe, and it is worth being precise about what it buys. The
classes land on the real `role="menu"` surface and the real `role="menuitem"`
rows rather than on a wrapper around them; the trigger is the Kit's own
`Button` component rather than a copy of its classes; and where Bits' own
output is wrong for the pattern — its menu separator and its group heading both
carry the run's own `role="group"` — this Kit writes the right role after the
spread, because what an application receives is this layer and not Bits'.

daisyUI was evaluated and deliberately stays out (ADR 0005): it is appearance
only, so it cannot answer the Composite problem, and as a second styling
vocabulary it is the split-brain the anti-hardcode lint exists to prevent. What
it contributes instead is the bar — a Composite's API has to feel as
ready-to-use as daisyUI's, with good defaults and one obvious way. The
canonical Base `DropdownMenu` and `Navbar` meet that bar once for every child
Kit; Application specializations compose them explicitly when needed, as
`StoreNavigation` does with `Navbar`.

The three directional navigation surfaces share one item contract and require
`currentId` to identify exactly one destination. `SidebarNavigation` and
`BottomNavigation` render the existing `NavItem`, so native links, disabled
state, focus rings, and `aria-current` remain one contract. `StoreNavigation`
composes the canonical Base `Navbar`; its optional announcement, brand, and
actions are snippets so promotion language and commerce behavior stay in the
consumer. Bottom placement likewise remains consumer-owned rather than fixing
the component to a page arrangement.

The three application layouts stay on the same side of that boundary. The
shell composes Base `SkipLink`, `Container`, and `Stack`; the two column
arrangements compose Base `Stack` for their internal rhythm. They decide only
the reusable frame, responsive columns, landmarks, and focus order. Navigation
trees, page headings, filters, inspector panels, and all business content stay
in the snippets a Product Application supplies. Every inset and gap remains a
Density role, and none of the layouts selects Theme, Color Scheme, or Density
for the content nested inside it.

The titling surfaces keep outline semantics separate from page arrangement.
`PageHeading` always contributes the page's single `h1`; context, supporting
copy, and canonical action controls remain caller-owned. `CardHeading` composes
Base `SectionHeading`, so its visual size stays independent from the explicit
`h2`–`h6` depth chosen by the consumer. `ActionPanel` composes Base `Card` and
`SectionHeading` into a named region with one body and one footer action
cluster. None owns a page layout, form schema, or business sentence.

The commerce catalogue surfaces follow that same boundary. `ProductList`
composes Base `GridList` and `Card` into a required named collection;
`ProductOverview` and `ProductFeature` compose the canonical heading, media,
and flow contracts while accepting all product language and imagery from the
consumer. `ProductQuickview` delegates modal labeling, focus containment,
Escape dismissal, and focus return to Base `Dialog`. None selects a Theme,
Color Scheme, or Density, and none decides the page around it.

```svelte
<PageHeading title="Deployments" description="Manage releases.">
  {#snippet actions()}<Button>New deployment</Button>{/snippet}
</PageHeading>

<ActionPanel title="Production deployment">
  <DeploymentFields />
  {#snippet actions()}<Button>Save</Button>{/snippet}
</ActionPanel>
```

The refinement surfaces likewise keep query behavior and result arrangement
local. `Filter` composes Base `ToggleGroup`, so one active option, roving arrow
focus, `aria-pressed`, and optional native submission remain the canonical
contract. `CategoryFilter` composes Base `Fieldset` and `Checkbox`, so every
active category is independently announced and keyboard reachable. Consumers
own the option labels, selected values, and what changing those values does;
neither surface selects Theme, Color Scheme, or Density.

```svelte
<Filter legend="Availability" {filters} bind:value={availability} />
<CategoryFilter legend="Categories" {categories} bind:values={selectedCategories} />
```

`Diff` presents caller-computed comparison rows without taking ownership of
source parsing or business content. Its default inline mode keeps changes in
one reading order; `mode="side-by-side"` aligns the same rows in the canonical
keyboard-resizable `SplitView`. Removal and addition feedback uses the Theme's
danger and success roles, while visible `−` and `+` markers and announced
change labels preserve the meaning without colour. All row insets and gaps
remain live Density roles, and the component selects none of the appearance
axes around its content.

```svelte
<Diff
  label="Deployment changes"
  rows={[
    { before: "replicas = 2", after: "replicas = 3" },
    { after: "health_check = true" },
  ]}
  mode="side-by-side"
/>
```

The three social surfaces keep chronology, identity, and score semantics in
their existing canonical contracts. `ActivityFeed` delegates its ordered list,
machine-readable time, and optional links to Base `Timeline`. `ChatMessage`
composes Base `MediaObject` and `Avatar` around caller-owned message content.
`Review` adds Base `Card` and a disabled Base `Rating`, whose native selected
value, visible filled and empty symbols, and numeric output make the score
perceivable without colour. Authors, timestamps, message and review copy,
actions, destinations, and the arrangement of the surrounding page all remain
consumer-owned.

The commerce surfaces own reusable relationships, never a checkout page.
`CheckoutForm` binds caller-owned field definitions to Base `Form`, `Fieldset`,
`Field`, and `Input`, so native submission and complete error associations stay
canonical. `ShoppingCart` uses the same native submission boundary for named
quantity controls and keeps its total in one polite atomic live region.
`OrderSummary` composes `Card`, `SectionHeading`, and `DescriptionList`, while
`OrderHistory` composes `SectionHeading` and `Table` for caption, header scope,
machine-readable dates, and keyboard-reachable overflow. Product names, money
formatting, field vocabulary, actions, validation policy, persistence, and page
arrangement all remain consumer-owned.

The merchandising surfaces keep the same boundary. `CategoryPreview` composes
Base `Card`, `AspectRatio`, and `Link`, so its destination is visibly named and
keyboard reachable while imagery, category language, and surrounding collection
remain caller-owned. `Incentive` composes `MediaObject` and `SectionHeading` into
a named value proposition; its artwork, copy, actions, and page placement stay
local to the Product Application. Both inherit every appearance axis and route
their rhythm through Density roles.

```svelte
<CheckoutForm {sections} submitLabel="Place order" aria-label="Checkout" />
<ShoppingCart title="Shopping cart" {items} totalLabel="Total" {total} />
<OrderSummary title="Order summary" {lines} totalLabel="Total" {total} />
<OrderHistory title="Order history" caption="Past orders" {orders} />
<CategoryPreview name="Desks" href="/categories/desks" media={categoryMedia} />
<Incentive title="Complimentary delivery" description="Orders over $50 ship free." icon={deliveryIcon} />
```

## What a page pays for

Only what it imports. Bits hydrates where it is imported and nowhere else, and
the Kit's barrel is named exports over side-effect-free modules — which is what
`"sideEffects": false` in `package.json` tells a bundler, and without which
every Primitive in the barrel survives into every bundle that touches one.

`test/tree-shaking.test.ts` is that claim as a measurement rather than a
promise: it puts two entry files through a real production build — one
importing the inherited Base `DropdownMenu`, one importing the inherited Base
`Button` — and reads the output. The menu's bundle carries the canonical
Composite, its Button, and Bits' menu, without pulling in Application
components or unrelated Bits primitives; Button's bundle carries no behavior
base at all.

## How it stays on-Brand

The Kit names colours and radii — `bg-primary`, `rounded-lg` — and never values.
Those utilities come from the Theme Layer's `@theme` surface and resolve to
`--reddb-*` custom properties, which is what lets one component render under
any Theme without knowing Themes exist.

`pnpm --filter kit-app lint` enforces it, over Composites exactly as
over Primitives — a Composite's appearance comes from the same `tv()` call over
the same utilities, so there is nothing new to lint and nothing new to learn.
The rule itself lives in `@reddb-io/kit-lint`, shared with the Base Kit since
its first component arrived (issue #47): what is this Kit's own is
`tools/lint-cli.ts` and the files it hands over.
The vocabulary it checks against is read from the generated artifacts, not
restated: a colour must be one the **Color Schemes declare**, not merely one the
Tokens Layer ships. The
difference matters — `bg-neutral-900` resolves through a real token and is
still wrong here, because no Color Scheme reassigns it, so a component wearing
it would ignore contrast changes. The showcase's per-component routes
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
stop: `h-8` compiles to 2rem, which is what `control-height-md` renders at,
so it is a violation, while `pt-1` is the same 0.25rem as `gap-sm` in a position
the axis ships no inset for and is left alone. An arbitrary value in one of
those positions holds a `--reddb-spatial-*` role or nothing: a raw length is the
same freeze spelled out, and `[var(--reddb-spacing-6)]` is a real token that no
stop reassigns. `test/fixtures/raw-spatial.variants.ts` is a component written
all four wrong ways, kept committed so the rule is known to fail; between it and
`test/density.test.ts`, where every routed value is pinned, a step the axis owns
cannot quietly come back.

## Consuming it

A Product Application receives this directory as vendorable Svelte 5 source via
`ds-sync` at a pinned DS release (ADR 0002), inside the one package the Sync
assembles, where this Kit is the `./app` subpath (ADR 0006):

```svelte
<script lang="ts">
  import { Button, DropdownMenu, Kbd } from "@reddb-io/design-system/base";
</script>

<Button variant="secondary" size="sm">Search <Kbd keys={["Ctrl", "K"]} /></Button>

<DropdownMenu
  triggerLabel="Account"
  contentLabel="Account actions"
  items={[
    { id: "profile", label: "Profile", onselect: openProfile },
    { id: "settings", label: "Settings", href: "/settings" },
    { heading: "Workspace", items: [{ id: "members", label: "Members", onselect: openMembers }] },
  ]}
/>
```

…and the whole masthead, with the Logo the Base Kit routed to the same
consumer (ADR 0004) in the region that exists for it:

```svelte
<script lang="ts">
  import { DropdownMenu, Logo, Navbar } from "@reddb-io/design-system/base";
</script>

<Navbar
  align="center"
  links={[
    { id: "nodes", label: "Nodes", href: "/nodes", active: true },
    { id: "queries", label: "Queries", href: "/queries" },
  ]}
>
  {#snippet brand()}<Logo href="/" />{/snippet}
  {#snippet actions()}
    <DropdownMenu triggerLabel="Account" contentLabel="Account actions" items={accountItems} />
  {/snippet}
</Navbar>
```

The application shell owns one brand mark even when several of its regions
offer a brand slot. Resolve that ownership once, at the composition level:

```svelte
<script lang="ts">
  import { shellBrandRegion } from "@reddb-io/design-system/app";

  const brandRegion = shellBrandRegion({ navbar: true, rail: true });
</script>
```

The precedence is **Navbar brand region → SidebarRail top region → sidebar
panel header**. Render the shared brand snippet only when a region matches the
resolver's result; do not pass the same mark independently to every available
slot. This keeps the composition configurable while guaranteeing one brand
mark. Omitting `navbar` selects the rail, and omitting both selects the panel
header.

The application frame and a sidebar arrangement use the same public subpath.
Each owns a main landmark, so they are alternative page frames rather than
landmarks to nest inside one another:

```svelte
<script lang="ts">
  import { ApplicationShell, SidebarLayout } from "@reddb-io/design-system/app";
</script>

<ApplicationShell>
  {#snippet header()}Product navigation{/snippet}
  {#snippet children()}Page content{/snippet}
</ApplicationShell>

<SidebarLayout sidebarLabel="Workspace navigation">
  {#snippet sidebar()}Navigation{/snippet}
  {#snippet children()}Workspace content{/snippet}
</SidebarLayout>
```

What lands is installable as it arrives: this Kit's own `package.json` does not
travel — out there the Kit is a subpath, not a package — and `ds-sync` folds
its runtime contract into the one manifest it assembles for the package, with
no workspace refs and none of the DS-internal scripts below
(`scripts/producer/README.md`). That contract has two entries:
`tailwind-variants` for the appearance and `bits-ui` for the Composites'
behavior, both published ranges a consumer's own install resolves. The Kit's
`tsconfig.json` does travel, with its `extends` chain inlined, so it reaches for
nothing outside the consumer tree.

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
pnpm --filter kit-app test    # component tests, the Taxonomy and tree-shaking tests, the check's own tests
pnpm --filter kit-app check   # consumer svelte-check over the Kit's source, strict tsconfig
pnpm --filter kit-app lint    # anti-hardcode lint over the Kit's source: colour, radius, spatial
pnpm --filter kit-app build   # stage the vendorable source into dist/ for the release bundle
```
