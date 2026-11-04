import type { WorkspacePersistence } from "./workspace-persistence";
import { parseConnectionString } from "@reddb-io/design-system/adapters/reddb";

export interface LocalConnectionProfile {
  id: string;
  label: string;
  endpoint: string;
  credentialRef: string;
}

/** Convert already-saved legacy credentials without putting a credential URI
 * in metadata. Originals remain encrypted in their source until verification. */
export function legacyConnectionMigration(entries: Record<string, string>, labels: { id: string; label: string }[]) {
  const metadata: Record<string, string> = {};
  const secrets = { ...entries };
  for (const label of labels) {
    const raw = entries[`history:${label.id}`];
    if (!raw) continue;
    try {
      const parsed = parseConnectionString(raw);
      const endpoint = new URL(parsed.url);
      if (endpoint.username || endpoint.password || !["http:", "https:"].includes(endpoint.protocol)) continue;
      const id = `legacy:${label.id}`;
      const credentialRef = `connection:${id}`;
      metadata[`local-connection-v1:${id}`] = JSON.stringify({ id, label: label.label, endpoint: parsed.url, credentialRef });
      secrets[credentialRef] = JSON.stringify(parsed.credentials ?? { token: "" });
    } catch { /* Keep unrecognized originals in the Vault for manual recovery. */ }
  }
  return { metadata, secrets };
}

/** Saved connections are opt-in, including App handoffs. Labels and endpoints
 * remain readable while locked; only the native Vault contains authentication. */
export class LocalConnections {
  profiles = $state<LocalConnectionProfile[]>([]);
  private readonly metadataPrefix = "local-connection-v1:";
  constructor(private readonly persistence: WorkspacePersistence) {}

  async load() {
    const metadata = await this.persistence.read();
    const profiles: unknown[] = Object.entries(metadata)
      .filter(([key]) => key.startsWith(this.metadataPrefix))
      .map(([, value]) => JSON.parse(value));
    this.profiles = profiles.filter((value): value is LocalConnectionProfile => {
      const profile = value as Partial<LocalConnectionProfile> | null;
      if (!profile || typeof profile.id !== "string" || typeof profile.label !== "string"
          || typeof profile.endpoint !== "string" || typeof profile.credentialRef !== "string") return false;
      try {
        const endpoint = new URL(profile.endpoint);
        return !endpoint.username && !endpoint.password && ["http:", "https:"].includes(endpoint.protocol);
      } catch { return false; }
    });
  }

  async save(endpoint: string, label: string, credentials: { token: string } | { username: string; password: string }) {
    const parsed = new URL(endpoint);
    if (parsed.username || parsed.password || !["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Save a credential-free HTTP endpoint");
    }
    // Each explicit save owns a distinct profile, including multiple users at
    // the same endpoint. Credential material never becomes a metadata hash.
    const id = crypto.randomUUID();
    const profile = { id, label, endpoint: parsed.href.replace(/\/$/, ""), credentialRef: `connection:${id}` };
    await this.persistence.commit({ [this.metadataPrefix + id]: JSON.stringify(profile) }, {
      [profile.credentialRef]: JSON.stringify(credentials),
    });
    await this.load();
  }

  async credentials(profile: LocalConnectionProfile): Promise<{ token: string } | { username: string; password: string }> {
    const value = await this.persistence.vault.get(profile.credentialRef);
    if (!value) throw new Error("This connection's credential is unavailable");
    const parsed = JSON.parse(value);
    if (typeof parsed.token === "string") return { token: parsed.token };
    if (typeof parsed.username === "string" && typeof parsed.password === "string") return parsed;
    throw new Error("This connection's credential is invalid");
  }

  async forget(profile: LocalConnectionProfile) {
    await this.persistence.commit({ [this.metadataPrefix + profile.id]: null }, { [profile.credentialRef]: null });
    await this.load();
  }
}
