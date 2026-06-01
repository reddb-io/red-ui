// Open Contract URL pre-configuration. A Surface can seed the loaded Core with
// a browser-reachable reddb endpoint (`cs`), an initial app route (`to`), and a
// short-lived token carried only in the URL hash. The Core currently consumes
// `cs` + `to` through ConnectionProvider.bootParams(); the token is parsed for
// the public contract but is deliberately not persisted by this module.

/** Parsed Open Contract from the app URL. */
export interface OpenContract {
  /** Browser-reachable reddb HTTP endpoint, e.g. `http://host:5055`. */
  cs?: string;
  /** Initial app route, e.g. `/cluster` or `/c/users/p/table`. */
  to?: string;
  /** Short-lived bearer token, read only from the URL hash. */
  token?: string;
}

/** Non-secret connection config a Surface may seed via the app URL. */
export interface BootParams {
  /** reddb endpoint to connect to (e.g. `http://host:5055` or `red://host`). */
  endpoint?: string;
  /** Legacy initial top-level view: `query` | `collections` | `cluster` | `security`. */
  view?: string;
  /** Open Contract initial route, e.g. `/cluster` or `/c/users/p/table`. */
  to?: string;
}

// Query keys that carry the endpoint (mirrors the legacy ?connection= reading).
const ENDPOINT_KEYS = ["endpoint", "connection", "red_url", "red"];
const VIEW_KEY = "view";
const CS_KEY = "cs";
const TO_KEY = "to";
const TOKEN_KEY = "token";

// Legacy query secrets are dropped. The Open Contract token is read from the
// hash only, never from the query string.
const SECRET_KEY =
  /(token|secret|password|passwd|auth|credential|api[-_]?key|bearer)/i;

export type OpenContractErrorCode =
  | "EMPTY_CS"
  | "FILESYSTEM_PATH"
  | "MALFORMED_URL"
  | "UNSUPPORTED_SCHEME"
  | "SECRET_IN_CS"
  | "MALFORMED_ROUTE";

export class OpenContractError extends Error {
  constructor(
    public readonly code: OpenContractErrorCode,
    message: string
  ) {
    super(message);
    this.name = "OpenContractError";
  }
}

function splitUrlParts(
  input: string | URL,
  explicitHash = ""
): { search: string; hash: string } {
  if (input instanceof URL) return { search: input.search, hash: input.hash };

  const raw = input ?? "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    const url = new URL(raw);
    return { search: url.search, hash: url.hash };
  }

  const hashAt = raw.indexOf("#");
  const search = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  const hash = hashAt >= 0 ? raw.slice(hashAt) : explicitHash;
  return { search, hash };
}

function looksLikeFilesystemPath(value: string): boolean {
  return (
    /^file:/i.test(value) ||
    /^~(?:\/|\\|$)/.test(value) ||
    /^(?:\.{1,2})(?:\/|\\|$)/.test(value) ||
    /^(?:\/|\\)/.test(value) ||
    /^[a-z]:[\\/]/i.test(value) ||
    value.includes("\\")
  );
}

function normalizeCs(input: string): string {
  const cs = input.trim().replace(/\/$/, "");
  if (!cs) throw new OpenContractError("EMPTY_CS", "Open Contract cs is empty");
  if (looksLikeFilesystemPath(cs)) {
    throw new OpenContractError(
      "FILESYSTEM_PATH",
      "Open Contract cs must be a browser-reachable URL, not a filesystem path"
    );
  }

  let url: URL;
  try {
    url = new URL(cs);
  } catch {
    throw new OpenContractError(
      "MALFORMED_URL",
      "Open Contract cs is not a valid URL"
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new OpenContractError(
      "UNSUPPORTED_SCHEME",
      "Open Contract cs must use http:// or https://"
    );
  }

  for (const key of url.searchParams.keys()) {
    if (SECRET_KEY.test(key)) {
      throw new OpenContractError(
        "SECRET_IN_CS",
        "Open Contract secrets must be carried in the app URL hash, not inside cs"
      );
    }
  }

  return cs;
}

function normalizeRoute(input: string): string {
  const to = input.trim();
  if (!to)
    throw new OpenContractError("MALFORMED_ROUTE", "Open Contract to is empty");
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(to) ||
    to.startsWith("//") ||
    to.includes("\\")
  ) {
    throw new OpenContractError(
      "MALFORMED_ROUTE",
      "Open Contract to must be an app route"
    );
  }
  const route = to.startsWith("/") ? to : `/${to}`;
  if (
    route === "/query" ||
    route === "/collections" ||
    route === "/cluster" ||
    route === "/security" ||
    route.startsWith("/c/")
  ) {
    return route;
  }
  throw new OpenContractError(
    "MALFORMED_ROUTE",
    "Open Contract to must target a known red-ui route"
  );
}

/** Parse the public Open Contract (`cs`, `to`, `token`) from a URL/search/hash. */
export function parseOpenContract(
  input: string | URL,
  explicitHash = ""
): OpenContract {
  const { search, hash } = splitUrlParts(input, explicitHash);
  const query = new URLSearchParams(search);
  const hashParams = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash
  );
  const out: OpenContract = {};

  const cs = query.get(CS_KEY);
  if (cs !== null) out.cs = normalizeCs(cs);

  const to = query.get(TO_KEY);
  if (to !== null) out.to = normalizeRoute(to);

  const token = hashParams.get(TOKEN_KEY);
  if (token) out.token = token;

  return out;
}

/** Encode the public Open Contract, carrying `token` only in the hash. */
export function encodeOpenContract(contract: OpenContract): string {
  const query = new URLSearchParams();
  const hash = new URLSearchParams();

  if (contract.cs) query.set(CS_KEY, normalizeCs(contract.cs));
  if (contract.to) query.set(TO_KEY, normalizeRoute(contract.to));
  if (contract.token) hash.set(TOKEN_KEY, contract.token);

  const q = query.toString();
  const h = hash.toString();
  return `${q ? `?${q}` : ""}${h ? `#${h}` : ""}`;
}

/**
 * Parse boot params from a URL query string (e.g. `location.search`). Returns
 * only the non-secret endpoint + route/view. Query tokens are ignored; hash
 * tokens remain part of the public Open Contract parser and are not surfaced to
 * the provider boot params, so they cannot be persisted by the connection flow.
 */
export function parseBootParams(search: string, hash = ""): BootParams {
  const params = new URLSearchParams(search ?? "");
  const out: BootParams = {};

  const cs = params.get(CS_KEY);
  if (cs !== null) {
    try {
      out.endpoint = normalizeCs(cs);
    } catch {
      // Invalid Open Contract endpoints are rejected by omitting the endpoint;
      // the full parser still throws for callers that need diagnostics.
    }
  }

  const to = params.get(TO_KEY);
  if (to !== null) {
    try {
      out.to = normalizeRoute(to);
    } catch {
      /* invalid route: ignore for boot */
    }
  }

  for (const key of ENDPOINT_KEYS) {
    if (out.endpoint) break;
    const v = params.get(key);
    if (v && !SECRET_KEY.test(key)) {
      out.endpoint = v;
      break;
    }
  }

  const view = params.get(VIEW_KEY);
  if (view) out.view = view;

  // Read the token from hash to validate the contract source, but do not copy
  // it into BootParams. This prevents accidental persistence via connection
  // history while keeping parseOpenContract() available for the later bootstrap.
  try {
    void parseOpenContract(search, hash).token;
  } catch {
    /* contract diagnostics are for parseOpenContract callers */
  }

  return out;
}

/** True iff the boot params carry an endpoint to auto-connect to. */
export function hasBootEndpoint(b: BootParams): boolean {
  return typeof b.endpoint === "string" && b.endpoint.trim().length > 0;
}

/** True iff the boot params carry an initial app route. */
export function hasBootRoute(b: BootParams): boolean {
  return typeof b.to === "string" && b.to.trim().length > 0;
}
