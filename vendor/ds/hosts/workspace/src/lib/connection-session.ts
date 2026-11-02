import { parseConnectionString } from "./reddb/connection-string";
import type { KeyValueStorage } from "./connection-history";

/** Reload recovery for one browser tab; passwords never enter this record. */
export interface ConnectionSession {
  target: string;
  token?: string;
  managed?: boolean;
}

/** A caller-scoped sessionStorage backend, separate from durable history. */
export class ConnectionSessionStore {
  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly key: string
  ) {}

  read(): ConnectionSession | null {
    try {
      const value = JSON.parse(this.storage?.getItem(this.key) ?? "null");
      if (!value || typeof value.target !== "string") return null;
      const parsed = parseConnectionString(value.target);
      if (parsed.credentials || !/^https?:\/\//.test(parsed.url)) return null;
      if (value.token !== undefined && typeof value.token !== "string")
        return null;
      return {
        target: parsed.url,
        ...(value.token ? { token: value.token } : {}),
        ...(value.managed === true ? { managed: true } : {}),
      };
    } catch {
      return null;
    }
  }

  write(value: ConnectionSession): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(value));
    } catch {
      // A blocked/full sessionStorage must not break a successful connection.
      this.clear();
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* Storage may be restricted. */
    }
  }
}
