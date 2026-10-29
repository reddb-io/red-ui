import { describe, expect, it } from "vitest";
import { applyAppearance } from "../theme.svelte";
import { applySkin, DEFAULT_SKIN, skinByName } from "./skins";

describe("DS appearance adoption", () => {
  it("keeps a host's Density while switching Color Scheme independently", () => {
    const host = document.createElement("div");
    host.dataset.density = "spacious";
    applyAppearance(host, "dark");
    expect(host.dataset).toMatchObject({
      theme: "application",
      colorScheme: "dark",
      density: "spacious",
    });
    applyAppearance(host, "light");
    expect(host.dataset.colorScheme).toBe("light");
    expect(host.dataset.density).toBe("spacious");
  });

  it("restores the canonical DS cascade after a custom skin without clearing host styles", () => {
    const host = document.createElement("div");
    host.style.setProperty("--host-custom", "retained");
    applyAppearance(host, "dark");
    expect(host.dataset.density).toBe("compact");
    host.style.setProperty("--reddb-color-background", "#0a0b14");
    host.style.setProperty("--color-bg-0", "#0a0b14");
    applySkin(skinByName("nocturne"), host);
    applySkin(DEFAULT_SKIN, host);
    expect(host.style.getPropertyValue("--reddb-color-background")).toBe("");
    expect(host.style.getPropertyValue("--color-bg-0")).toBe("");
    expect(host.style.getPropertyValue("--host-custom")).toBe("retained");
    expect(host.dataset.colorScheme).toBe("dark");
  });
});
