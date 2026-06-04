export interface PermissionResource {
  kind: string;
  name: string;
  tenant?: string;
}

export interface PermissionCheck {
  action: string;
  resource: PermissionResource;
  current_tenant?: string;
}

export interface PermissionDecision extends PermissionCheck {
  allowed: boolean;
  reason?: string;
}

export interface PermissionTransport {
  authCan(checks: PermissionCheck[]): Promise<PermissionDecision[]>;
}

function keyFor(check: PermissionCheck): string {
  const tenant = check.resource.tenant ?? "";
  const currentTenant = check.current_tenant ?? "";
  return [
    check.action,
    check.resource.kind,
    check.resource.name,
    tenant,
    currentTenant,
  ].join("\u001f");
}

function deny(check: PermissionCheck, reason: string): PermissionDecision {
  return { ...check, allowed: false, reason };
}

export class PermissionGate {
  readonly #transport: PermissionTransport;
  readonly #cache = new Map<string, PermissionDecision>();
  readonly #inFlight = new Map<string, Promise<PermissionDecision>>();

  constructor(transport: PermissionTransport) {
    this.#transport = transport;
  }

  cachedDecision(check: PermissionCheck): PermissionDecision | null {
    return this.#cache.get(keyFor(check)) ?? null;
  }

  cachedCan(check: PermissionCheck): boolean {
    return this.cachedDecision(check)?.allowed === true;
  }

  async decision(check: PermissionCheck): Promise<PermissionDecision> {
    await this.preload([check]);
    return (
      this.cachedDecision(check) ??
      deny(check, "auth.can did not return a decision")
    );
  }

  async can(check: PermissionCheck): Promise<boolean> {
    return (await this.decision(check)).allowed;
  }

  async preload(checks: readonly PermissionCheck[]): Promise<void> {
    const missing = checks.filter((check) => !this.#cache.has(keyFor(check)));
    if (missing.length === 0) return;

    const unique = new Map<string, PermissionCheck>();
    for (const check of missing) {
      const key = keyFor(check);
      if (!this.#inFlight.has(key)) unique.set(key, check);
    }

    if (unique.size > 0) {
      const batch = [...unique.values()];
      const batchPromise = this.#transport
        .authCan(batch)
        .then((results) => {
          const byKey = new Map(
            results.map((result) => [keyFor(result), result] as const)
          );
          for (const check of batch) {
            const key = keyFor(check);
            this.#cache.set(
              key,
              byKey.get(key) ?? deny(check, "auth.can omitted this check")
            );
          }
        })
        .catch((e) => {
          const reason = (e as Error).message || "auth.can failed";
          for (const check of batch) {
            this.#cache.set(keyFor(check), deny(check, reason));
          }
        })
        .finally(() => {
          for (const check of batch) this.#inFlight.delete(keyFor(check));
        });

      for (const check of batch) {
        const key = keyFor(check);
        this.#inFlight.set(
          key,
          batchPromise.then(
            () =>
              this.#cache.get(key) ??
              deny(check, "auth.can did not return a decision")
          )
        );
      }
    }

    await Promise.all(
      missing.map((check) => this.#inFlight.get(keyFor(check)))
    );
  }
}
