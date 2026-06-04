import { describe, expect, it } from "vitest";
import {
  PermissionGate,
  type PermissionCheck,
  type PermissionDecision,
  type PermissionTransport,
} from "./permission-gate";

const configRead: PermissionCheck = {
  action: "config:read",
  resource: { kind: "config", name: "*" },
};

function fakeTransport(
  decide: (check: PermissionCheck) => boolean
): PermissionTransport & { calls: PermissionCheck[][] } {
  const calls: PermissionCheck[][] = [];
  return {
    calls,
    async authCan(checks) {
      calls.push(checks);
      return checks.map(
        (check): PermissionDecision => ({
          ...check,
          allowed: decide(check),
          reason: decide(check) ? "allowed by test" : "default deny",
        })
      );
    },
  };
}

describe("PermissionGate", () => {
  it("answers can(action, resource) from POST /auth/can decisions", async () => {
    const transport = fakeTransport((check) => check.action === "config:read");
    const gate = new PermissionGate(transport);

    await expect(gate.can(configRead)).resolves.toBe(true);
    await expect(
      gate.can({
        action: "config:write",
        resource: { kind: "config", name: "*" },
      })
    ).resolves.toBe(false);
  });

  it("caches grant decisions by action and resource", async () => {
    const transport = fakeTransport(() => true);
    const gate = new PermissionGate(transport);

    await expect(gate.can(configRead)).resolves.toBe(true);
    await expect(gate.can(configRead)).resolves.toBe(true);

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0]).toEqual([configRead]);
  });

  it("batches preload and exposes synchronous cached decisions for rendering", async () => {
    const secretMetadata: PermissionCheck = {
      action: "vault:read_metadata",
      resource: { kind: "vault", name: "*" },
    };
    const transport = fakeTransport(
      (check) => check.action !== "vault:read_metadata"
    );
    const gate = new PermissionGate(transport);

    await gate.preload([configRead, secretMetadata, configRead]);

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0]).toEqual([configRead, secretMetadata]);
    expect(gate.cachedCan(configRead)).toBe(true);
    expect(gate.cachedCan(secretMetadata)).toBe(false);
    expect(gate.cachedDecision(secretMetadata)?.reason).toBe("default deny");
  });

  it("fails closed and caches denial when auth.can transport fails", async () => {
    const calls: PermissionCheck[][] = [];
    const gate = new PermissionGate({
      async authCan(checks) {
        calls.push(checks);
        throw new Error("POST /auth/can unavailable");
      },
    });

    await expect(gate.can(configRead)).resolves.toBe(false);
    await expect(gate.can(configRead)).resolves.toBe(false);

    expect(calls).toHaveLength(1);
    expect(gate.cachedDecision(configRead)?.reason).toBe(
      "POST /auth/can unavailable"
    );
  });
});
