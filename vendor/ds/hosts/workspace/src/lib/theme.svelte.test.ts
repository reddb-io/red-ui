import { describe, expect, it } from "vitest";
import { MemoryStorage } from "./workspace-storage";
import { ThemeStore } from "./theme.svelte";

describe("workspace Color Scheme persistence", () => {
  it("restores durable Color Scheme over the pre-paint fallback", () => {
    const storage = new MemoryStorage();
    storage.setItem("red-ui-theme", "dark");
    const root = document.createElement("div");
    root.dataset.colorScheme = "light";
    const theme = new ThemeStore("red-ui-theme", storage, false);

    theme.init({ target: root, persist: true });

    expect(theme.current).toBe("dark");
    expect(root.dataset.colorScheme).toBe("dark");
  });

  it("keeps a host-owned Color Scheme when persistence is disabled", () => {
    const storage = new MemoryStorage();
    storage.setItem("red-ui-theme", "dark");
    const root = document.createElement("div");
    root.dataset.colorScheme = "light";
    const theme = new ThemeStore("red-ui-theme", storage, false);

    theme.init({ target: root, persist: false });

    expect(theme.current).toBe("light");
    expect(root.dataset.colorScheme).toBe("light");
  });
});
