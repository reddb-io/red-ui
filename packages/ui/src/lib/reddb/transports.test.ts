import { describe, expect, it } from "vitest";
import {
  BROWSER_TRANSPORTS,
  DESKTOP_TRANSPORTS,
  isUrlReachable,
  transportForUrl,
} from "./transports";
import { LocalUrlProvider } from "./local-url-provider";

describe("transportForUrl", () => {
  it("maps known schemes to wire transports", () => {
    expect(transportForUrl("http://h:5055")).toBe("http");
    expect(transportForUrl("https://h")).toBe("https");
    // red:///reds:// are sugar for http(s)://host:5055 (normalizeUrl), so they
    // classify as their coerced http(s) transport — not a native tcp/tls one.
    expect(transportForUrl("red://localhost")).toBe("http");
    expect(transportForUrl("reds://localhost")).toBe("https");
    expect(transportForUrl("red+unix:///var/run/red.sock")).toBe("unix");
    expect(transportForUrl("file:///data/app.redb")).toBe("unix");
  });

  it("treats a bare host:port as http (normalizeUrl prepends it)", () => {
    expect(transportForUrl("localhost:5055")).toBe("http");
  });

  it("returns null for an unrecognised scheme and empty input", () => {
    expect(transportForUrl("ftp://h")).toBeNull();
    expect(transportForUrl("   ")).toBeNull();
  });
});

describe("isUrlReachable", () => {
  it("a browser Surface advertises http(s) only (ADR-0003)", () => {
    // No distinct native red(s):// or file:// transport in a browser.
    expect([...BROWSER_TRANSPORTS]).toEqual(["http", "https"]);
  });

  it("a browser Surface reaches http(s) and coerced red:// but not unix/file", () => {
    expect(isUrlReachable("http://h", BROWSER_TRANSPORTS)).toBe(true);
    expect(isUrlReachable("red://localhost", BROWSER_TRANSPORTS)).toBe(true); // coerced tunnel → http
    expect(isUrlReachable("reds://localhost", BROWSER_TRANSPORTS)).toBe(true); // coerced tunnel → https
    expect(isUrlReachable("file:///data/app.redb", BROWSER_TRANSPORTS)).toBe(
      false
    );
    expect(isUrlReachable("red+unix:///s.sock", BROWSER_TRANSPORTS)).toBe(
      false
    );
  });

  it("a desktop Surface additionally reaches unix/file", () => {
    expect(isUrlReachable("file:///data/app.redb", DESKTOP_TRANSPORTS)).toBe(
      true
    );
    expect(isUrlReachable("red+unix:///s.sock", DESKTOP_TRANSPORTS)).toBe(true);
  });

  it("an unrecognised scheme is never reachable", () => {
    expect(isUrlReachable("ftp://h", DESKTOP_TRANSPORTS)).toBe(false);
  });
});

describe("LocalUrlProvider.transports", () => {
  it("defaults to the browser-reachable set", () => {
    expect(new LocalUrlProvider().transports()).toEqual([
      ...BROWSER_TRANSPORTS,
    ]);
  });

  it("honours an injected Surface transport set (Tauri)", () => {
    const p = new LocalUrlProvider({ transports: [...DESKTOP_TRANSPORTS] });
    expect(p.transports()).toEqual([...DESKTOP_TRANSPORTS]);
    expect(p.transports()).not.toBe(p.transports()); // returns a copy, not the internal array
  });
});
