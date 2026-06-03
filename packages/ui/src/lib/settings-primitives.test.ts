import { describe, expect, it } from "vitest";
import { createRawSnippet } from "svelte";
import { render } from "svelte/server";
import {
  ListRow,
  NavItem,
  SectionHeading,
  Pill,
  EmptyState,
  LoadingState,
} from "@reddb-io/ui-kit";

// Light SSR render assertions — the test env is `node`, so we render to a
// string with `svelte/server` and assert structure rather than mounting a DOM.
// Slots are supplied as raw snippets returning a marker element.
const marker = (html: string) =>
  createRawSnippet(() => ({ render: () => html }));

describe("ListRow", () => {
  it("renders title, description, and the mono hint", () => {
    const { body } = render(ListRow, {
      props: {
        title: "Active target",
        description: "The cluster red-ui is bound to.",
        hint: "red://localhost",
      },
    });
    expect(body).toContain("Active target");
    expect(body).toContain("The cluster red-ui is bound to.");
    expect(body).toContain("red://localhost");
    // The hint rides the mono typeface.
    expect(body).toContain("font-mono");
  });

  it("places the action slot and a full-width below slot", () => {
    const { body } = render(ListRow, {
      props: {
        title: "Telemetry",
        action: marker("<i data-testid='act'></i>"),
        below: marker("<i data-testid='below'></i>"),
      },
    });
    expect(body).toContain("data-testid='act'");
    expect(body).toContain("data-testid='below'");
  });

  it("switches to the stacked layout in `wide` mode", () => {
    const inline = render(ListRow, { props: { title: "x" } }).body;
    const wide = render(ListRow, { props: { title: "x", wide: true } }).body;
    // The default is an inline (items-center) row; wide stacks it as a column.
    expect(inline).toContain("items-center");
    expect(inline).not.toContain("data-wide");
    expect(wide).toContain("flex-col");
    expect(wide).toContain("data-wide");
  });
});

describe("NavItem", () => {
  it("marks the active item with aria-current=page", () => {
    const active = render(NavItem, {
      props: { label: "General", active: true },
    }).body;
    const idle = render(NavItem, {
      props: { label: "General", active: false },
    }).body;
    expect(active).toContain('aria-current="page"');
    expect(idle).not.toContain('aria-current="page"');
    expect(active).toContain("General");
  });

  it("renders an anchor when given an href, a button otherwise", () => {
    const link = render(NavItem, {
      props: { label: "Go", href: "/settings" },
    }).body;
    const btn = render(NavItem, { props: { label: "Go" } }).body;
    expect(link).toContain("<a");
    expect(link).toContain('href="/settings"');
    expect(btn).toContain("<button");
  });

  it("places the trailing slot", () => {
    const { body } = render(NavItem, {
      props: {
        label: "Tables",
        trailing: marker("<i data-testid='count'></i>"),
      },
    });
    expect(body).toContain("data-testid='count'");
  });
});

describe("SectionHeading", () => {
  it("renders the title and places the icon + meta slots", () => {
    const { body } = render(SectionHeading, {
      props: {
        title: "Connection",
        icon: marker("<i data-testid='icon'></i>"),
        meta: marker("<i data-testid='meta'></i>"),
      },
    });
    expect(body).toContain("Connection");
    expect(body).toContain("data-testid='icon'");
    expect(body).toContain("data-testid='meta'");
  });
});

describe("Pill", () => {
  it("defaults to the muted tone and switches to accent", () => {
    const muted = render(Pill, { props: { children: marker("3") } }).body;
    const accent = render(Pill, {
      props: { tone: "accent", children: marker("Live") },
    }).body;
    expect(muted).toContain("text-fg-2");
    expect(accent).toContain("text-accent");
    expect(accent).toContain("Live");
  });
});

describe("EmptyState / LoadingState", () => {
  it("EmptyState renders title, description, and the action slot", () => {
    const { body } = render(EmptyState, {
      props: {
        title: "No connection",
        description: "Run `red serve` to start.",
        action: marker("<i data-testid='fix'></i>"),
      },
    });
    expect(body).toContain("No connection");
    expect(body).toContain("Run `red serve` to start.");
    expect(body).toContain("data-testid='fix'");
  });

  it("LoadingState renders its label and respects reduced motion", () => {
    const { body } = render(LoadingState, { props: { label: "Probing…" } });
    expect(body).toContain("Probing…");
    expect(body).toContain("motion-safe:animate-spin");
  });
});
