import type {
  VectorRow,
  VectorSearchRequest,
  VectorSearchResponse,
} from "../../vector-explorer";
/** Portable vector browsing and search. Database work is explicitly injected. */
export interface VectorExplorerContract {
  /** Accessible name of the explorer. */
  label: string;
  /** Browse rows, preserving coordinates and metadata separately. */
  rows: readonly VectorRow[];
  /** Optional dataset identity. A change cancels pending search. */
  context?: string;
  /** Existing search results, if the host opened a search response. */
  searchResults?: VectorSearchResponse;
  /** Runs a search through the host. Reject to retain the draft and show an error. */
  onsearch?: (
    request: VectorSearchRequest,
    signal: AbortSignal,
  ) => Promise<VectorSearchResponse>;
}
