// The MCP host uses the pinned Design System adapter. The build stages its
// source and license into this package so the published executable is standalone.
import { RedClient as AdapterClient } from "./vendor-adapter/client.js";
import { DevConsoleStore } from "./vendor-adapter/dev-console.js";
export { runQueryPreferStream } from "./vendor-adapter/client.js";
export type {
  QueryRow,
  QueryResult,
  StreamedQueryResult,
} from "./vendor-adapter/client.js";

/** Public MCP client options retained for existing callers. */
export interface RedClientOptions {
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

/** Preserve the MCP client's empty-list fallback without retaining query logs. */
export class RedClient extends AdapterClient {
  constructor(baseUrl: string, opts: RedClientOptions = {}) {
    super(baseUrl, { ...opts, console: new DevConsoleStore(0) });
  }

  override async collections(): Promise<string[]> {
    return (await super.collections()) ?? [];
  }
}

export type ReadClient = Pick<
  RedClient,
  "query" | "collections" | "queryStreamCollect"
>;
