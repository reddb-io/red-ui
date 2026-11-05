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
  /** Optional source or category supplied by the host, such as an API name. */
  source?: string;
  /** Optional display-ready capture time supplied by the host. */
  timeLabel?: string;
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
  return requests.filter((request) => [request.method, request.target, request.status, request.source, request.timeLabel].some((value) => value?.toLocaleLowerCase().includes(query)));
}

/** Format measured durations without presenting missing measurements as zero. */
export function formatRequestDuration(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return "Not measured";
  if (value < 1 && value > 0) return "<1 ms";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

/** Prepare a single visible detail view for copying. Only caller-supplied data is included. */
export function formatRequestDetails(request: DeveloperRequest, view: "request" | "response" | "headers" | "timing"): string {
  const lines = [`${request.method} ${request.target} · ${request.status}`];
  if (view === "headers") {
    lines.push("Response headers:");
    for (const [key, value] of request.responseHeaders ?? []) lines.push(`${key}: ${value}`);
    lines.push("", "Request headers:");
    for (const [key, value] of request.requestHeaders ?? []) lines.push(`${key}: ${value}`);
  } else if (view === "timing") {
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

/** HTTP status codes use feedback tones; non-HTTP or unknown statuses remain neutral. */
export function developerRequestStatusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  const code = /^(\d{3})(?:\s|$)/.exec(status.trim());
  if (!code) return "neutral";
  const value = Number(code[1]);
  if (value >= 500 && value < 600) return "danger";
  if (value >= 400 && value < 500) return "warning";
  if (value >= 300 && value < 400) return "info";
  if (value >= 200 && value < 300) return "success";
  return "neutral";
}

/** Clamp a user-resized bottom panel to its available host height. */
export function clampDeveloperPanelHeight(height: number, available: number): number {
  const limit = Math.max(0, available);
  return Math.min(limit, Math.max(Math.min(160, limit), height));
}

/** Resize the horizontal separator with the keyboard; null leaves other keys alone. */
export function developerPanelHeightForKey(key: string, height: number, available: number): number | null {
  const step = Math.max(1, available * 0.02);
  if (key === "ArrowUp") return clampDeveloperPanelHeight(height + step, available);
  if (key === "ArrowDown") return clampDeveloperPanelHeight(height - step, available);
  if (key === "Home") return clampDeveloperPanelHeight(available, available);
  if (key === "End") return clampDeveloperPanelHeight(0, available);
  return null;
}
