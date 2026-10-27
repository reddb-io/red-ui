import { afterEach, expect, test, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import DisconnectedState from "./DisconnectedState.svelte";
import { secureStore } from "./secureStore.svelte";

const originalSurface = secureStore.surface;
const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  secureStore.surface = originalSurface;
  document.body.innerHTML = "";
});

function render() {
  const target = document.createElement("div");
  document.body.append(target);
  const component = mount(DisconnectedState, { target });
  flushSync();
  cleanups.push(() => {
    void unmount(component);
  });
  return target;
}

test("the zero-state action opens the existing connection flow without probing a target", () => {
  secureStore.surface = "web";
  const open = vi.fn();
  window.addEventListener("red:open-connect", open);
  cleanups.push(() => window.removeEventListener("red:open-connect", open));
  const target = render();
  target.querySelector("button")!.click();
  expect(open).toHaveBeenCalledOnce();
  expect(target.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});

test("embedded recovery directs the user to host-owned authentication", () => {
  secureStore.surface = "embedded";
  const target = render();
  expect(target.querySelector("button")).toBeNull();
  expect(target.textContent).toContain("host application");
});
