import type { ComponentProps } from 'svelte'
import type DeveloperRequestInspector from '@reddb-io/design-system/data/DeveloperRequestInspector'
type DeveloperRequest = ComponentProps<typeof DeveloperRequestInspector>['requests'][number]
import type { ConsoleEntry } from './reddb/dev-console'

/** Presentation adapter only. Capture and redaction belong to the RedDB client. */
export function consoleRequests(entries: readonly ConsoleEntry[]): DeveloperRequest[] {
  return entries.map(entry => ({
    id: String(entry.id),
    method: entry.verb,
    target: entry.target,
    status: entry.status === undefined ? (entry.ok ? 'OK' : 'Error') : String(entry.status),
    source: entry.kind === 'query' ? 'Query' : 'HTTP',
    timeLabel: new Date(entry.startedAt).toLocaleTimeString(),
    durationMs: entry.durationMs,
    requestBody: entry.payload,
    responseBody: entry.response,
    requestHeaders: entry.requestHeaders,
    responseHeaders: entry.responseHeaders,
    connection: entry.rowCount === undefined ? undefined : [['Rows returned', String(entry.rowCount)]],
    error: entry.error,
  }))
}
