import { afterEach, expect, test, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import ConnectDropdown from "./ConnectDropdown.svelte";
import { connection } from "./connections.svelte";

let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
  if (component) await unmount(component);
  component = undefined;
  connection.disconnect();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function render() {
  connection.disconnect();
  const target = document.createElement("div");
  document.body.appendChild(target);
  component = mount(ConnectDropdown, { target });
  flushSync();
  target.querySelector<HTMLButtonElement>("button")!.click();
  flushSync();
  // The canonical Popover portals its surface into the document.
  return document.body;
}

function fill(target: HTMLElement, selector: string, value: string) {
  const input = target.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  flushSync();
  return input;
}

function submit(target: HTMLElement) {
  target
    .querySelector("form")!
    .dispatchEvent(new Event("submit", { cancelable: true }));
  flushSync();
}

test.each([
  ["red", "http"],
  ["reds", "https"],
])(
  "%s credentials select password login and are removed before it completes",
  async (scheme, protocol) => {
    const login = vi.spyOn(connection, "login").mockResolvedValue(false);
    const connect = vi.spyOn(connection, "tryConnect");
    const target = render();
    const input = fill(
      target,
      "#connect-url",
      `${scheme}://al%40ice:p%40ss%3Aword@localhost`
    );
    submit(target);
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${protocol}://localhost:5055`,
        id: `${protocol}://localhost:5055`,
      }),
      "al@ice",
      "p@ss:word"
    );
    expect(connect).not.toHaveBeenCalled();
    expect(input.value).toBe(`${protocol}://localhost:5055`);
    await vi.waitFor(() => expect(target.textContent).toContain("unreachable"));
    expect(target.innerHTML).not.toContain("p%40ss");
    expect(target.innerHTML).not.toContain("p@ss");
  }
);

test("a credential-free endpoint still connects anonymously", () => {
  const login = vi.spyOn(connection, "login").mockResolvedValue(false);
  const connect = vi.spyOn(connection, "tryConnect").mockResolvedValue(false);
  const target = render();
  fill(target, "#connect-url", "red://localhost");
  submit(target);
  expect(connect).toHaveBeenCalledWith(
    expect.objectContaining({ url: "http://localhost:5055" })
  );
  expect(login).not.toHaveBeenCalled();
});

test("separate sign-in fields still work and the password is cleared", () => {
  const login = vi.spyOn(connection, "login").mockResolvedValue(false);
  const target = render();
  fill(target, "#connect-url", "reds://localhost");
  fill(target, "#connect-username", "alice");
  const password = fill(target, "#connect-password", "secret");
  submit(target);
  expect(login).toHaveBeenCalledWith(
    expect.objectContaining({ url: "https://localhost:5055" }),
    "alice",
    "secret"
  );
  expect(password.value).toBe("");
});

test("a protected database opens the sign-in fields after an anonymous 401", () => {
  const target = render();
  connection.probe = {
    reachable: false,
    error:
      "Database credentials required (HTTP 401). Sign in with a database username and password.",
  };
  flushSync();
  expect(target.querySelector("details")?.open).toBe(true);
  expect(target.textContent).toContain("HTTP 401");
  expect(
    target.querySelector<HTMLInputElement>("#connect-password")?.value
  ).toBe("");
});

test.each(["red://alice@localhost", "reds://alice:%ZZ@localhost"])(
  "invalid credentials show a safe error without making a request: %s",
  (input) => {
    const login = vi.spyOn(connection, "login");
    const connect = vi.spyOn(connection, "tryConnect");
    const target = render();
    const url = fill(target, "#connect-url", input);
    submit(target);
    expect(target.textContent).toContain("Invalid connection string.");
    expect(url.value).toBe("");
    expect(login).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  }
);

test("conflicting credential sources require an explicit choice", () => {
  const login = vi.spyOn(connection, "login");
  const target = render();
  fill(target, "#connect-url", "reds://alice:inline@localhost");
  fill(target, "#connect-username", "bob");
  const password = fill(target, "#connect-password", "separate");
  submit(target);
  expect(target.textContent).toContain(
    "Use credentials in either the connection string or the sign-in fields."
  );
  expect(password.value).toBe("");
  expect(login).not.toHaveBeenCalled();
});

test.each([false, true])(
  "managed wire credentials use public HTTPS and never enter rendered metadata (Base64=%s)",
  async (encoded) => {
    const login = vi.spyOn(connection, "login").mockResolvedValue(false);
    const target = render();
    const uri = "reds://alice:p%40ss%3Aword@orders.acme.dbs.reddb.dev:5050";
    const input = fill(target, "#connect-url", encoded ? btoa(uri) : uri);
    submit(target);
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://orders.acme.dbs.reddb.dev" }),
      "alice",
      "p@ss:word"
    );
    expect(input.value).toBe("https://orders.acme.dbs.reddb.dev");
    expect(target.innerHTML).not.toContain("p%40ss");
    expect(target.innerHTML).not.toContain("p@ss");
  }
);
