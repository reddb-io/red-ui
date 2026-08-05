# Base Kit

The parent Kit every other Kit inherits, routed to every consumer (ADR 0004).
Its `kit.json` declares `audience: "*"` and no `parents` — it is the root of
the Kit graph, and every other Kit in `kits/` declares it as a parent.

## Why it exists

A component that every application needs — the Logo first — should not oblige
an application to pull a sibling Kit to reach it. So the Base Kit is delivered
by inheritance: `ds-sync` resolves a declared Kit's parents transitively, so a
consumer that declares **any** Kit receives this one too, and a consumer that
needs nothing else may declare `base` alone.

Nothing in the Sync knows the name `base`. "Routed to every consumer" holds
because every Kit declares the parent, which is checked on the DS side by
`scripts/producer/test/kits.test.ts` — a Kit added without that declaration
fails there instead of quietly reaching only the consumers that name it.

## What is in it

Nothing yet. The Logo lands here with issue #46, together with the vendored
Marks it renders; `src/index.ts` carries the `BASE_COMPONENTS` list it will
join, pinned against the files on disk by `test/components.test.ts`.

The bar for entry is higher than the application Kit's, not lower: a component
here reaches every audience, so it must be cross-audience by nature.

## The anti-hardcode lint

The application Kit's lint (`kits/app/tools/lint.ts`) asks that every colour
and radius a Kit wears names a token the Themes reassign. This Kit has no
component to ask it of yet, so it carries no lint of its own — the Kit's first
component brings it, and brings it by **extracting** the application Kit's
linter into something both Kits run rather than by copying it.

## Consuming it

Same as any Kit: `ds-sync` lands it as vendorable Svelte 5 source at a pinned
DS release (ADR 0002), rewritten to be installable as it arrives
(`scripts/producer/README.md`). The difference is only that no consumer has to
ask for it.

## Commands

```
pnpm --filter @reddb-io/kit-base test    # the routing manifest and the public surface
pnpm --filter @reddb-io/kit-base build   # stage the vendorable source into dist/ for the release bundle
```
