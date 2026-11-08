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
export declare function filterDeveloperRequests(requests: readonly DeveloperRequest[], filter: string): DeveloperRequest[];
/** Format measured durations without presenting missing measurements as zero. */
export declare function formatRequestDuration(value: number | undefined): string;
/** Prepare a single visible detail view for copying. Only caller-supplied data is included. */
export declare function formatRequestDetails(request: DeveloperRequest, view: "request" | "response" | "headers" | "timing"): string;
/** HTTP status codes use feedback tones; non-HTTP or unknown statuses remain neutral. */
export declare function developerRequestStatusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger";
/** Clamp a user-resized bottom panel to its available host height. */
export declare function clampDeveloperPanelHeight(height: number, available: number): number;
/** Resize the horizontal separator with the keyboard; null leaves other keys alone. */
export declare function developerPanelHeightForKey(key: string, height: number, available: number): number | null;
