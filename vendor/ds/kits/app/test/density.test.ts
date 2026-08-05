// The Kit under the Density axis.
//
// ADR 0003 makes Density the DS's third axis and names the price: "component
// size maps must route spatial values through density-aware tokens instead of
// raw utilities". A Tailwind step compiles to a fixed rem, so a Kit written in
// steps is frozen against a stop the same way a Kit written in hex would be
// frozen against a Theme. This file is the proof that the price was paid, and
// it asks the three questions that make the migration true rather than merely
// done:
//
//   1. Does each spatial position name a density role instead of a step?
//   2. Does that role still render, under `comfortable`, exactly the length the
//      step it replaced rendered at? (The axis was adopted, not applied — the
//      Kit's appearance must not have moved.)
//   3. Does it render something else under `compact` and `spacious`? (Otherwise
//      the routing is decoration.)
//
// The lengths come from the Tokens Layer's own artifacts, resolved through the
// `var(--reddb-space-*)` chain the browser follows, so nothing here is a second
// opinion about what a stop means — it is the stop's own output, read back.
//
// What is NOT routed is as deliberate as what is. The axis ships nine spatial
// roles, three steps each of control height, inset and gap; a Kit value that is
// not one of them has nothing to route through, and routing it anyway would
// either move what `comfortable` renders or invent a role the Tokens Layer does
// not ship. That is the same refusal the colour rule already makes, so a Kbd's
// cap height (which tracks the text it sits in, and which density is forbidden
// to touch) and a spinner's icon scale stay on Tailwind's own steps.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import Badge from "../src/primitives/Badge.svelte";
import Button from "../src/primitives/Button.svelte";
import Card from "../src/primitives/Card.svelte";
import EmptyState from "../src/primitives/EmptyState.svelte";
import Kbd from "../src/primitives/Kbd.svelte";
import ListRow from "../src/primitives/ListRow.svelte";
import LoadingState from "../src/primitives/LoadingState.svelte";
import NavItem from "../src/primitives/NavItem.svelte";
import NodeBadge from "../src/primitives/NodeBadge.svelte";
import Pill from "../src/primitives/Pill.svelte";
import SectionHeading from "../src/primitives/SectionHeading.svelte";
import SplitView from "../src/primitives/SplitView.svelte";
import { badge } from "../src/primitives/badge.variants";
import { button } from "../src/primitives/button.variants";
import { card } from "../src/primitives/card.variants";
import { emptyState } from "../src/primitives/empty-state.variants";
import { kbdChord } from "../src/primitives/kbd.variants";
import { listRow } from "../src/primitives/list-row.variants";
import { loadingState } from "../src/primitives/loading-state.variants";
import { navItem } from "../src/primitives/nav-item.variants";
import { nodeBadge } from "../src/primitives/node-badge.variants";
import { pill } from "../src/primitives/pill.variants";
import { sectionHeading } from "../src/primitives/section-heading.variants";
import { kitSourceFiles } from "../tools/paths";
import { classesOf, render } from "./mount";

const require_ = createRequire(import.meta.url);

/** A generated artifact, read through the Tokens Layer's own exports map. */
function artifact(specifier: string): string {
  return readFileSync(require_.resolve(specifier), "utf8");
}

/** Every `--reddb-*: value` declaration in a generated stylesheet. */
function declarations(css: string): Map<string, string> {
  const declared = new Map<string, string>();
  for (const match of css.matchAll(/(--reddb-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declared.set(match[1]!, match[2]!.trim());
  }
  return declared;
}

/** The three stops of the axis (ADR 0003), each read from its own artifact. */
const STOPS = ["compact", "comfortable", "spacious"] as const;
type Stop = (typeof STOPS)[number];

const brandScale = declarations(artifact("@reddb-io/tokens/tokens.css"));
const stops = new Map<Stop, Map<string, string>>(
  STOPS.map((stop) => [
    stop,
    declarations(artifact(`@reddb-io/tokens/density-${stop}.css`)),
  ])
);

/**
 * The length `role` renders at under `stop` — the stop's reassignment followed
 * through to the step of the Brand's spacing scale it lands on.
 */
function renders(role: string, stop: Stop): string {
  const declared = stops.get(stop)!.get(`--reddb-spatial-${role}`);
  expect(
    declared,
    `the ${stop} stop declares no --reddb-spatial-${role}`
  ).toBeDefined();
  const reference = /^var\(\s*(--reddb-[a-z0-9-]+)\s*\)$/.exec(declared!);
  expect(
    reference,
    `${role} at ${stop} is a value, not a step of the Brand's scale`
  ).not.toBeNull();
  const length = brandScale.get(reference![1]!);
  expect(length, `nothing declares ${reference![1]}`).toBeDefined();
  return length!;
}

/** One spatial position a Kit class routes through the axis. */
interface Routed {
  /** The Tailwind position the value sits in: `h`, `px`, `py`, `pb`, `gap`. */
  position: string;
  /** The density role that position now names. */
  role: string;
  /** The fixed step it replaced… */
  was: string;
  /** …and the length that step rendered at, which `comfortable` must keep. */
  length: string;
}

/** One class string the Kit produces, and what it routes. */
interface Specimen {
  name: string;
  classes: () => string;
  routed: readonly Routed[];
}

const HEIGHT_SM: Routed = {
  position: "h",
  role: "control-height-sm",
  was: "h-8",
  length: "2rem",
};
const HEIGHT_MD: Routed = {
  position: "h",
  role: "control-height-md",
  was: "h-9",
  length: "2.25rem",
};
const HEIGHT_LG: Routed = {
  position: "h",
  role: "control-height-lg",
  was: "h-11",
  length: "2.75rem",
};

const inset = (position: string, step: "sm" | "md" | "lg"): Routed =>
  ({
    sm: { position, role: "inset-sm", was: `${position}-3`, length: "0.75rem" },
    md: { position, role: "inset-md", was: `${position}-4`, length: "1rem" },
    lg: { position, role: "inset-lg", was: `${position}-6`, length: "1.5rem" },
  })[step];

const GAP_SM: Routed = {
  position: "gap",
  role: "gap-sm",
  was: "gap-1",
  length: "0.25rem",
};
const GAP_MD: Routed = {
  position: "gap",
  role: "gap-md",
  was: "gap-2",
  length: "0.5rem",
};
const GAP_LG: Routed = {
  position: "gap",
  role: "gap-lg",
  was: "gap-3",
  length: "0.75rem",
};

// Every spatial value in the Kit that the axis owns, component by component.
// A position missing from a row is a value the axis ships no role for — see the
// header note; the guard below is what stops a routed one quietly coming back.
const SPECIMENS: readonly Specimen[] = [
  { name: "Badge", classes: () => badge(), routed: [GAP_SM] },
  {
    name: "Button, size sm",
    classes: () => button({ size: "sm" }),
    routed: [HEIGHT_SM, inset("px", "sm"), GAP_MD],
  },
  {
    name: "Button, size md",
    classes: () => button({ size: "md" }),
    routed: [HEIGHT_MD, inset("px", "md"), GAP_MD],
  },
  {
    name: "Button, size lg",
    classes: () => button({ size: "lg" }),
    routed: [HEIGHT_LG, inset("px", "lg"), GAP_MD],
  },
  {
    name: "Card header, padding md",
    classes: () => card({ padding: "md" }).header(),
    routed: [inset("py", "md"), GAP_SM],
  },
  {
    name: "Card body, padding md",
    classes: () => card({ padding: "md" }).body(),
    routed: [inset("py", "md")],
  },
  {
    name: "Card footer, padding md",
    classes: () => card({ padding: "md" }).footer(),
    routed: [inset("py", "md"), GAP_MD],
  },
  {
    name: "Card header, padding sm",
    classes: () => card({ padding: "sm" }).header(),
    routed: [inset("px", "sm"), GAP_SM],
  },
  {
    name: "Card body, padding sm",
    classes: () => card({ padding: "sm" }).body(),
    routed: [inset("px", "sm")],
  },
  {
    name: "Card footer, padding sm",
    classes: () => card({ padding: "sm" }).footer(),
    routed: [inset("px", "sm"), GAP_MD],
  },
  {
    name: "EmptyState root, size sm",
    classes: () => emptyState({ size: "sm" }).root(),
    routed: [GAP_MD, inset("px", "md"), inset("py", "lg")],
  },
  {
    name: "EmptyState root, size md",
    classes: () => emptyState({ size: "md" }).root(),
    routed: [GAP_LG, inset("px", "lg")],
  },
  {
    name: "EmptyState actions",
    classes: () => emptyState().actions(),
    routed: [GAP_MD],
  },
  { name: "Kbd chord", classes: () => kbdChord().root(), routed: [GAP_SM] },
  {
    name: "ListRow root, comfortable",
    classes: () => listRow({ density: "comfortable" }).root(),
    routed: [GAP_LG, inset("px", "md"), inset("py", "sm")],
  },
  {
    name: "ListRow root, compact",
    classes: () => listRow({ density: "compact" }).root(),
    routed: [GAP_MD, inset("px", "sm")],
  },
  {
    name: "ListRow trailing",
    classes: () => listRow().trailing(),
    routed: [GAP_MD],
  },
  {
    name: "LoadingState root",
    classes: () => loadingState().root(),
    routed: [GAP_MD],
  },
  {
    name: "NavItem root",
    classes: () => navItem().root(),
    routed: [GAP_MD, inset("px", "sm")],
  },
  {
    name: "NodeBadge root",
    classes: () => nodeBadge().root(),
    routed: [GAP_MD],
  },
  {
    name: "Pill, size md",
    classes: () => pill({ size: "md" }),
    routed: [inset("px", "sm")],
  },
  {
    name: "SectionHeading root, with a rule",
    classes: () => sectionHeading({ rule: true }).root(),
    routed: [GAP_LG, inset("pb", "sm")],
  },
  {
    name: "SectionHeading text",
    classes: () => sectionHeading().text(),
    routed: [GAP_SM],
  },
  {
    name: "SectionHeading actions",
    classes: () => sectionHeading().actions(),
    routed: [GAP_MD],
  },
];

/** Every fixed step the axis owns, i.e. every step the Kit stopped writing. */
const OWNED: readonly string[] = [
  ...new Set(
    SPECIMENS.flatMap((specimen) => specimen.routed.map((routed) => routed.was))
  ),
].sort();

describe("every spatial value the Density axis owns is named through it", () => {
  for (const specimen of SPECIMENS) {
    it(`${specimen.name} names roles, not steps`, () => {
      const worn = classesOf(specimen.classes());
      for (const { position, role, was } of specimen.routed) {
        const named = worn.has(`${position}-[var(--reddb-spatial-${role})]`);
        expect(
          named,
          `${specimen.name} does not name ${role} in its ${position} position`
        ).toBe(true);
        expect(
          worn.has(was),
          `${specimen.name} still wears the fixed ${was}`
        ).toBe(false);
      }
    });
  }
});

describe("what a stop resolves those roles to", () => {
  const routed = new Map<string, Routed>(
    SPECIMENS.flatMap((specimen) => specimen.routed).map((entry) => [
      entry.role,
      entry,
    ])
  );

  for (const [role, { was, length }] of routed) {
    it(`renders ${role} at ${length} under comfortable — what ${was} rendered at`, () => {
      // The neutral is the whole reason this migration is safe to land: adopting
      // the axis changes nothing until a consumer declares another stop.
      expect(renders(role, "comfortable")).toBe(length);
    });

    it(`moves ${role} under compact and spacious`, () => {
      expect(renders(role, "compact")).not.toBe(length);
      expect(renders(role, "spacious")).not.toBe(length);
    });
  }
});

/** Class names the Kit writes, read the way the anti-hardcode lint reads them. */
function classesWritten(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const pattern = file.endsWith(".variants.ts")
    ? /"([^"\\\n]*)"|'([^'\\\n]*)'/g
    : /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  return [...source.matchAll(pattern)]
    .flatMap((match) => (match[1] ?? match[2] ?? "").split(/\s+/))
    .filter(Boolean);
}

describe("the Kit's source", () => {
  it("writes no fixed step the axis owns", () => {
    // Prose may still name a step — this reads class positions only, exactly as
    // the anti-hardcode lint does, so the guard cannot be tripped by a comment.
    const owned = new Set(OWNED);
    const offenders = kitSourceFiles().flatMap((file) =>
      classesWritten(file)
        .filter((written) => owned.has(written))
        .map((written) => `${file}: ${written}`)
    );
    expect(OWNED.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("names only spatial roles the Tokens Layer declares", () => {
    // A typo in a role name is invisible in the browser — the variable simply
    // resolves to nothing and the property is dropped — so it is caught here.
    const declared = new Set(stops.get("comfortable")!.keys());
    const named = new Set<string>();
    for (const file of kitSourceFiles()) {
      for (const match of readFileSync(file, "utf8").matchAll(
        /--reddb-spatial-[a-z0-9-]+/g
      )) {
        named.add(match[0]);
      }
    }
    expect(named.size).toBeGreaterThan(0);
    expect([...named].filter((name) => !declared.has(name))).toEqual([]);
  });
});

/** Every class worn anywhere in a rendered component's tree. */
function wornAnywhere(target: HTMLElement): Set<string> {
  const worn = new Set<string>();
  for (const element of target.querySelectorAll("*")) {
    for (const name of classesOf(element.getAttribute("class") ?? ""))
      worn.add(name);
  }
  return worn;
}

describe("no component renders a fixed step the axis owns", () => {
  // The variants modules are where the classes are written, but it is the
  // components that wear them — and a component that reached around its own
  // variants module would pass every assertion above.
  const MOUNTED: readonly [string, () => HTMLElement][] = [
    ["Badge", () => render(Badge, {})],
    ["Button", () => render(Button, {})],
    ["Button, size sm", () => render(Button, { size: "sm" })],
    ["Button, size lg", () => render(Button, { size: "lg", loading: true })],
    ["Card", () => render(Card, { title: "alpha", description: "a node" })],
    ["Card, padding sm", () => render(Card, { title: "alpha", padding: "sm" })],
    [
      "EmptyState",
      () =>
        render(EmptyState, { title: "No nodes yet", hint: "reddb node add" }),
    ],
    ["Kbd", () => render(Kbd, { keys: ["Ctrl", "K"] })],
    [
      "ListRow",
      () => render(ListRow, { title: "alpha", description: "a node" }),
    ],
    [
      "ListRow, compact",
      () => render(ListRow, { title: "alpha", density: "compact" }),
    ],
    ["LoadingState", () => render(LoadingState, {})],
    ["NavItem", () => render(NavItem, { label: "Nodes" })],
    ["NodeBadge", () => render(NodeBadge, { name: "alpha" })],
    ["Pill", () => render(Pill, {})],
    ["SectionHeading", () => render(SectionHeading, { title: "Nodes" })],
    ["SplitView", () => render(SplitView, {})],
  ];

  const owned = new Set(OWNED);

  for (const [name, mount] of MOUNTED) {
    it(`${name} wears none of them`, () => {
      const worn = [...wornAnywhere(mount())].filter((written) =>
        owned.has(written)
      );
      expect(worn).toEqual([]);
    });
  }
});
