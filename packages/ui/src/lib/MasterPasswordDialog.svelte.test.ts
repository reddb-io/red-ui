import { afterEach, expect, test } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import MasterPasswordDialog from "./MasterPasswordDialog.svelte";
import { secureStore } from "./secureStore.svelte";

let component: ReturnType<typeof mount> | undefined;
const initial = {
  backend: secureStore.backend,
  locked: secureStore.locked,
  needsSetup: secureStore.needsSetup,
};
afterEach(async () => {
  if (component) await unmount(component);
  component = undefined;
  Object.assign(secureStore, initial);
  document.body.innerHTML = "";
});

test("the credential lock retains focus and cannot be dismissed with Escape", () => {
  Object.assign(secureStore, {
    backend: "web",
    locked: true,
    needsSetup: false,
  });
  const target = document.createElement("div");
  document.body.append(target);
  component = mount(MasterPasswordDialog, { target });
  flushSync();
  const dialog = target.querySelector("dialog")!;
  const input = target.querySelector<HTMLInputElement>(
    'input[type="password"]'
  )!;
  expect(dialog.open).toBe(true);
  expect(document.activeElement).toBe(input);
  const escape = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  input.dispatchEvent(escape);
  flushSync();
  expect(escape.defaultPrevented).toBe(true);
  expect(dialog.open).toBe(true);
  expect(secureStore.locked).toBe(true);
  expect(document.activeElement).toBe(input);
  expect(dialog.querySelector("[data-dialog-close]")).toBeNull();
});
