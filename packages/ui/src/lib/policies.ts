import type { AuthPolicy } from "#reddb";
import type {
  PermissionCheck,
  PermissionDecision,
  PermissionResource,
} from "./permission-gate";

export const POLICY_READ_CHECK: PermissionCheck = {
  action: "policy:read",
  resource: { kind: "policy", name: "*" },
};

export interface CapabilityMatrixRow {
  id: string;
  action: string;
  resource: PermissionResource;
  resourceLabel: string;
  allowed: boolean;
  reason?: string;
  effects: string[];
  principals: string[];
  policies: string[];
}

function matrixKey(check: PermissionCheck): string {
  return [
    check.action,
    check.resource.kind,
    check.resource.name,
    check.resource.tenant ?? "",
    check.current_tenant ?? "",
  ].join("\u001f");
}

function resourceLabel(resource: PermissionResource): string {
  const base = `${resource.kind}:${resource.name}`;
  return resource.tenant ? `${base} @ ${resource.tenant}` : base;
}

export function parsePolicyResource(
  value: string | undefined,
  tenant?: string
): PermissionResource {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "*")
    return { kind: "resource", name: "*", tenant };

  const separator = trimmed.includes(":")
    ? ":"
    : trimmed.includes("/")
      ? "/"
      : null;
  if (!separator) return { kind: "resource", name: trimmed, tenant };

  const [kind, ...rest] = trimmed.split(separator);
  const name = rest.join(separator) || "*";
  return {
    kind: kind || "resource",
    name,
    tenant,
  };
}

export function capabilityMatrixChecksFromPolicies(
  policies: readonly AuthPolicy[]
): PermissionCheck[] {
  const checks = [POLICY_READ_CHECK];
  const seen = new Set(checks.map(matrixKey));

  for (const policy of policies) {
    const check: PermissionCheck = {
      action: policy.action?.trim() || "*",
      resource: parsePolicyResource(policy.resource, policy.tenant),
    };
    const key = matrixKey(check);
    if (seen.has(key)) continue;
    seen.add(key);
    checks.push(check);
  }

  return checks;
}

export function assembleCapabilityMatrix(
  policies: readonly AuthPolicy[],
  decisions: readonly PermissionDecision[]
): CapabilityMatrixRow[] {
  const policyChecks = capabilityMatrixChecksFromPolicies(policies);
  const decisionsByKey = new Map(
    decisions.map((decision) => [matrixKey(decision), decision] as const)
  );

  return policyChecks.map((check) => {
    const decision = decisionsByKey.get(matrixKey(check));
    const related = policies.filter((policy) => {
      const policyCheck: PermissionCheck = {
        action: policy.action?.trim() || "*",
        resource: parsePolicyResource(policy.resource, policy.tenant),
      };
      return matrixKey(policyCheck) === matrixKey(check);
    });

    return {
      id: matrixKey(check),
      action: check.action,
      resource: check.resource,
      resourceLabel: resourceLabel(check.resource),
      allowed: decision?.allowed === true,
      reason: decision?.reason,
      effects: [
        ...new Set(
          related
            .map((policy) => policy.effect)
            .filter((effect): effect is string => !!effect)
        ),
      ],
      principals: [
        ...new Set(
          related
            .map((policy) => policy.principal)
            .filter((principal): principal is string => !!principal)
        ),
      ],
      policies: [
        ...new Set(
          related
            .map(
              (policy, index) =>
                policy.name ?? policy.id ?? `policy ${index + 1}`
            )
            .filter((name): name is string => !!name)
        ),
      ],
    };
  });
}
