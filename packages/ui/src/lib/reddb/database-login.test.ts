import { describe, expect, it, vi } from "vitest";
import { RedClient } from "./client";
import { devConsole } from "./dev-console";

describe("database password sign-in", () => {
  it("reports an anonymous 401 as a sign-in requirement without reflecting the response body", async () => {
    const client = new RedClient("https://bank.example", {
      fetch: vi.fn(
        async () => new Response("private-error-detail", { status: 401 })
      ),
    });
    await expect(client.ping()).resolves.toEqual({
      ok: false,
      error:
        "Database credentials required (HTTP 401). Sign in with a database username and password.",
    });
  });
  it("exchanges credentials directly without redirects, cookies, or console entries", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ ok: true, token: "session-secret" })
    );
    const record = vi.spyOn(devConsole, "record");
    const client = new RedClient("https://bank.example", { fetch: fetcher });
    expect(await client.login("alice", "password-secret")).toBe(
      "session-secret"
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://bank.example/auth/login",
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        credentials: "omit",
        body: JSON.stringify({
          username: "alice",
          password: "password-secret",
        }),
      })
    );
    expect(record).not.toHaveBeenCalled();
    record.mockRestore();
  });

  it.each([
    "http://bank.example",
    "https://alice:secret@bank.example",
    "https://bank.example?token=secret",
    "https://bank.example#token=secret",
  ])("refuses unsafe credential targets: %s", async (endpoint) => {
    const fetcher = vi.fn();
    await expect(
      new RedClient(endpoint, { fetch: fetcher }).login("alice", "secret")
    ).rejects.toThrow("Use HTTPS");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not expose a server failure body in the error", async () => {
    const fetcher = vi.fn(
      async () => new Response("reflected-password-secret", { status: 401 })
    );
    await expect(
      new RedClient("https://bank.example", { fetch: fetcher }).login(
        "alice",
        "password-secret"
      )
    ).rejects.toThrow(
      "Database sign-in failed. Check your credentials and try again."
    );
  });

  it("rejects a successful response without a usable session", async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true }));
    await expect(
      new RedClient("https://bank.example", { fetch: fetcher }).login(
        "alice",
        "secret"
      )
    ).rejects.toThrow("did not return a session token");
  });
});
