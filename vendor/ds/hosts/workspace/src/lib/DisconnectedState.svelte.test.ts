import { afterEach, expect, test, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import DisconnectedState from "./DisconnectedState.svelte";
import { secureStore } from "./secureStore.svelte";
import { connection } from "./connections.svelte";
import { loading } from "./loading.svelte";

const originalSurface = secureStore.surface;
const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  connection.disconnect();
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

test("an active sign-in shows progress instead of a disconnected call to action", () => {
  loading.begin("Opening database");
  loading.step("Signing in");
  const target = render();
  expect(target.textContent).toContain("Connecting to your database");
  expect(target.textContent).toContain("Signing in");
  expect(target.querySelector("button")).toBeNull();
  expect(target.querySelector('[aria-busy="true"]')).not.toBeNull();
});
