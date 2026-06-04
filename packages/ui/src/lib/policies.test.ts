import { describe, expect, it } from "vitest";
import type { AuthPolicy } from "#reddb";
import type { PermissionDecision } from "./permission-gate";
import {
  POLICY_READ_CHECK,
  assembleCapabilityMatrix,
  capabilityMatrixChecksFromPolicies,
  parsePolicyResource,
} from "./policies";

const policies: AuthPolicy[] = [
  {
    id: "p1",
    name: "collection readers",
    principal: "role:analyst",
    action: "collection:read",
    resource: "collection:orders",
    effect: "allow",
  },
  {
    id: "p2",
    name: "collection readers duplicate",
    principal: "role:analyst",
    action: "collection:read",
    resource: "collection:orders",
    effect: "allow",
  },
  {
    id: "p3",
    name: "tenant secret deny",
    principal: "user:me",
    action: "vault:read",
    resource: "vault/*",
    tenant: "acme",
    effect: "deny",
  },
];

describe("policy capability matrix", () => {
  it("parses policy resource strings into auth.can resources", () => {
    expect(parsePolicyResource("collection:orders")).toEqual({
      kind: "collection",
      name: "orders",
      tenant: undefined,
    });
    expect(parsePolicyResource("vault/*", "acme")).toEqual({
      kind: "vault",
      name: "*",
      tenant: "acme",
    });
    expect(parsePolicyResource("*")).toEqual({
      kind: "resource",
      name: "*",
      tenant: undefined,
    });
  });

  it("builds a de-duplicated auth.can batch from the effective policy set", () => {
    expect(capabilityMatrixChecksFromPolicies(policies)).toEqual([
      POLICY_READ_CHECK,
      {
        action: "collection:read",
        resource: { kind: "collection", name: "orders", tenant: undefined },
      },
      {
        action: "vault:read",
        resource: { kind: "vault", name: "*", tenant: "acme" },
      },
    ]);
  });

  it("assembles readable allowed and denied rows from auth.can decisions", () => {
    const decisions: PermissionDecision[] = [
      { ...POLICY_READ_CHECK, allowed: true, reason: "policy-read grant" },
      {
        action: "collection:read",
        resource: { kind: "collection", name: "orders" },
        allowed: true,
        reason: "allow at p1.statement[0]",
      },
      {
        action: "vault:read",
        resource: { kind: "vault", name: "*", tenant: "acme" },
        allowed: false,
        reason: "explicit deny at p3.statement[0]",
      },
    ];

    expect(assembleCapabilityMatrix(policies, decisions)).toMatchObject([
      {
        action: "policy:read",
        resourceLabel: "policy:*",
        allowed: true,
        reason: "policy-read grant",
        effects: [],
      },
      {
        action: "collection:read",
        resourceLabel: "collection:orders",
        allowed: true,
        effects: ["allow"],
        principals: ["role:analyst"],
        policies: ["collection readers", "collection readers duplicate"],
      },
      {
        action: "vault:read",
        resourceLabel: "vault:* @ acme",
        allowed: false,
        reason: "explicit deny at p3.statement[0]",
        effects: ["deny"],
        principals: ["user:me"],
        policies: ["tenant secret deny"],
      },
    ]);
  });
});
