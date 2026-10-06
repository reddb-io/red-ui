import {
  Card,
  card,
  dialog,
  drawer,
  dropdownMenu,
  linkPreview,
  navbar,
  popover,
  table,
  tooltip,
} from "@reddb-io/design-system/base";
import { describe, expect, it } from "vitest";
import { classes, classesOf, render, rendered } from "./mount";

const overlayContract = [
  "bg-elevation-overlay-surface",
  "border-elevation-overlay-border",
  "shadow-elevation-overlay",
] as const;

describe("Base elevation", () => {
  it("gives every floating surface the complete overlay material", () => {
    const surfaces = {
      Dialog: dialog(),
      Drawer: drawer(),
      Popover: popover(),
      DropdownMenu: popover({ class: dropdownMenu().content() }),
      Tooltip: tooltip(),
      LinkPreview: linkPreview(),
    };

    for (const [name, surface] of Object.entries(surfaces)) {
      const worn = classesOf(surface);
      for (const token of overlayContract) {
        expect(worn.has(token), `${name} does not resolve ${token}`).toBe(true);
      }
    }
  });

  it("pairs the Popover's text with its overlay surface", () => {
    expect(classesOf(popover()).has("text-elevation-overlay-foreground")).toBe(true);
  });

  it("lets a raised Card compose elevation with its existing variant and tone axes", () => {
    const raised = rendered(render(Card, { raised: true, title: "Deployments" }));
    const worn = classes(raised);

    expect(raised.dataset.raised).toBe("true");
    for (const token of [
      "bg-elevation-raised-surface",
      "border-elevation-raised-border",
      "shadow-elevation-raised",
    ]) {
      expect(worn.has(token)).toBe(true);
    }

    const brandedPlain = classesOf(card({ raised: true, variant: "plain", tone: "brand" }).root());
    expect(brandedPlain.has("bg-[var(--reddb-color-primary)]")).toBe(true);
    expect(brandedPlain.has("border-transparent")).toBe(true);
    expect(brandedPlain.has("shadow-elevation-raised")).toBe(true);
  });

  it("bands the Navbar and table header with the complete chrome material", () => {
    const surfaces = {
      Navbar: navbar().root(),
      TableHeader: table().header(),
    };

    for (const [name, surface] of Object.entries(surfaces)) {
      const worn = classesOf(surface);
      for (const token of [
        "bg-elevation-sunken-surface",
        "border-elevation-sunken-border",
        "shadow-elevation-sunken",
      ]) {
        expect(worn.has(token), `${name} does not resolve ${token}`).toBe(true);
      }
    }
  });
});
