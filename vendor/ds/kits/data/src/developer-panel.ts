/** A measured phase of a request. Times are offsets and durations in milliseconds. */
export interface RequestPhase {
  /** Human-readable phase, such as DNS, TCP or TLS. */
  label: string;
  /** Offset from the start of the request in milliseconds. */
  startMs: number;
  /** Duration of this phase in milliseconds. */
  durationMs: number;
}

/** A caller-supplied request. The caller owns collection, redaction and retention. */
export interface DeveloperRequest {
  /** Stable identifier within the request list. */
  id: string;
  /** Method or operation, for example GET or SELECT. */
  method: string;
  /** Sanitized URL or logical target. */
  target: string;
  /** Response status or transport state. */
  status: string;
  /** Total duration in milliseconds when measured. */
  durationMs?: number;
  /** Sanitized request headers, preserving duplicate names. */
  requestHeaders?: readonly (readonly [string, string])[];
  /** Sanitized response headers, preserving duplicate names. */
  responseHeaders?: readonly (readonly [string, string])[];
  /** Sanitized request body, if supplied. */
  requestBody?: string;
  /** Sanitized response body, if supplied. */
  responseBody?: string;
  /** Measured request phases. Missing phases are not inferred. */
  phases?: readonly RequestPhase[];
  /** Caller-supplied connection facts such as protocol, remote address or TLS version. */
  connection?: readonly (readonly [string, string])[];
  /** Transport failure, if any. */
  error?: string;
}

/** Filter a supplied snapshot without inspecting body content. */
export function filterDeveloperRequests(requests: readonly DeveloperRequest[], filter: string): DeveloperRequest[] {
  const query = filter.trim().toLocaleLowerCase();
  return requests.filter((request) => [request.method, request.target, request.status].some((value) => value.toLocaleLowerCase().includes(query)));
}

/** Format measured durations without presenting missing measurements as zero. */
export function formatRequestDuration(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return "Not measured";
  if (value < 1 && value > 0) return "<1 ms";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

/** Prepare a single visible detail view for copying. Only caller-supplied data is included. */
export function formatRequestDetails(request: DeveloperRequest, view: "request" | "response" | "timing"): string {
  const lines = [`${request.method} ${request.target} · ${request.status}`];
  if (view === "timing") {
    lines.push(`Total: ${formatRequestDuration(request.durationMs)}`);
    for (const phase of request.phases ?? []) lines.push(`${phase.label}: ${formatRequestDuration(phase.durationMs)} (start ${formatRequestDuration(phase.startMs)})`);
    for (const [key, value] of request.connection ?? []) lines.push(`${key}: ${value}`);
  } else {
    const headers = view === "request" ? request.requestHeaders : request.responseHeaders;
    const body = view === "request" ? request.requestBody : request.responseBody;
    if (view === "response" && request.error) lines.push(request.error);
    for (const [key, value] of headers ?? []) lines.push(`${key}: ${value}`);
    if (body !== undefined) lines.push("", body);
  }
  return lines.join("\n");
}
