import { describe, expect, it } from "vitest";
import { bootGateLocked, surfaceFrom } from "./surface";

describe("surfaceFrom", () => {
  it("Tauri is the standalone Surface", () => {
    expect(
      surfaceFrom({ tauri: true, inFrame: false, mcp: false, embedLib: false })
    ).toBe("standalone");
    // Tauri wins even when also framed/mcp.
    expect(
      surfaceFrom({ tauri: true, inFrame: true, mcp: true, embedLib: true })
    ).toBe("standalone");
  });

  it("a framed or MCP context is the embedded Surface", () => {
    expect(
      surfaceFrom({ tauri: false, inFrame: true, mcp: false, embedLib: false })
    ).toBe("embedded");
    expect(
      surfaceFrom({ tauri: false, inFrame: false, mcp: true, embedLib: false })
    ).toBe("embedded");
    expect(
      surfaceFrom({ tauri: false, inFrame: false, mcp: false, embedLib: true })
    ).toBe("embedded");
  });

  it("a top-level browser page is the web Surface", () => {
    expect(
      surfaceFrom({ tauri: false, inFrame: false, mcp: false, embedLib: false })
    ).toBe("web");
  });
});

describe("bootGateLocked", () => {
  it("a credential-less embedded Surface is never locked", () => {
    expect(bootGateLocked("embedded", false)).toBe(false);
    expect(bootGateLocked("embedded", true)).toBe(false);
  });

  it("the standalone Surface keeps its vault gate (keychain unlocks it)", () => {
    expect(bootGateLocked("standalone", false)).toBe(true);
    expect(bootGateLocked("standalone", true)).toBe(true);
  });

  it("web never gates on persisted credentials because web stores labels only", () => {
    expect(bootGateLocked("web", false)).toBe(false); // nothing to protect → boot to data
    expect(bootGateLocked("web", true)).toBe(false); // legacy vault contents are not restored
  });
});
