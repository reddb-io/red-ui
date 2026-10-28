/** Connection input is ephemeral; only `url` may become connection metadata. */
export interface ConnectionCredentials {
  username: string;
  password: string;
}
export interface ParsedConnectionString {
  url: string;
  credentials?: ConnectionCredentials;
}
export class ConnectionStringError extends Error {
  constructor(
    message = "Enter a valid connection URL or its Base64 encoding."
  ) {
    super(message);
    this.name = "ConnectionStringError";
  }
}
const MAX_INPUT_LENGTH = 16_384;
const SECRET_KEY =
  /token|secret|password|passwd|auth|credential|api[-_]?key|bearer/i;

/** Decode exactly one layer, accepting standard Base64 and Base64url, with or without padding. */
export function decodeConnectionString(input: string): string {
  const raw = input.trim();
  if (!raw || raw.length > MAX_INPUT_LENGTH) throw new ConnectionStringError();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  const prefixed = /^base64(?:url)?:/i.test(raw);
  const value = prefixed ? raw.replace(/^base64(?:url)?:/i, "") : raw;
  // Hostnames with a dot or host:port are unambiguous plain inputs.
  if (!prefixed && !/^[\w+/=-]+$/.test(value)) return raw;
  let decodedText = false;
  try {
    if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) throw new Error();
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const unpadded = normalized.replace(/=+$/, "");
    if (
      unpadded.length % 4 === 1 ||
      (normalized.includes("=") && normalized.length % 4 !== 0)
    )
      throw new Error();
    const binary = atob(unpadded + "=".repeat((4 - (unpadded.length % 4)) % 4));
    if (btoa(binary).replace(/=+$/, "") !== unpadded) throw new Error();
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (char) => char.charCodeAt(0))
    );
    decodedText = true;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(decoded)) throw new Error();
    return decoded;
  } catch {
    // Undotted DNS labels are also valid plain inputs. A successfully decoded
    // non-URI is rejected (including double encoding), rather than retried.
    if (
      !prefixed &&
      !decodedText &&
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(raw)
    )
      return raw;
    throw new ConnectionStringError();
  }
}

/** Managed RedDB databases publish HTTPS on 443; their native wire and HTTP
 * container ports are not browser endpoints. Self-hosted aliases keep the
 * existing local HTTP bridge convention. Explicit HTTP(S) URLs stay caller-owned. */
function managedDatabaseHost(hostname: string): boolean {
  const label = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
  return new RegExp(
    `^${label}\\.${label}\\.dbs\\.reddb\\.(?:dev|io)$`,
    "i"
  ).test(hostname);
}
export function parseConnectionString(input: string): ParsedConnectionString {
  let raw = decodeConnectionString(input);
  if (/^(file|unix|red\+unix):\/\//i.test(raw)) return { url: raw };
  if (!raw.includes("://")) raw = "http://" + raw;
  const match = /^([a-z][a-z0-9+.-]*):\/\/(.+)$/i.exec(raw);
  if (!match) throw new ConnectionStringError();
  const scheme = match[1].toLowerCase();
  const wire = ["red", "red+tcp", "red+wire", "reds", "red+tls"].includes(
    scheme
  );
  const secure = ["https", "reds", "red+tls", "red+https"].includes(scheme);
  if (!wire && !["http", "https", "red+http", "red+https"].includes(scheme)) {
    throw new ConnectionStringError(
      "This connection requires an HTTP or HTTPS endpoint."
    );
  }
  try {
    const url = new URL(`${secure ? "https" : "http"}://${match[2]}`);
    if (!url.hostname || /\s/.test(url.hostname) || url.hash) throw new Error();
    for (const key of url.searchParams.keys())
      if (SECRET_KEY.test(key)) {
        throw new ConnectionStringError(
          "Use URI credentials or the sign-in fields, not secrets in query parameters."
        );
      }
    let credentials: ConnectionCredentials | undefined;
    if (url.username || url.password) {
      if (!url.username || !url.password)
        throw new ConnectionStringError(
          "A connection string needs both a username and a password."
        );
      credentials = {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
      };
      url.username = "";
      url.password = "";
    }
    if (wire) {
      if (managedDatabaseHost(url.hostname)) {
        url.protocol = "https:";
        url.port = "";
      } else {
        url.port = "5055";
      }
    }
    const endpoint = url.href.replace(/\/$/, "");
    return { url: endpoint, ...(credentials ? { credentials } : {}) };
  } catch (error) {
    if (error instanceof ConnectionStringError) throw error;
    throw new ConnectionStringError();
  }
}
