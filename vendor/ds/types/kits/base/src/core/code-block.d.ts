/** Copy exact source; unavailable or denied clipboard access is a recoverable result. */
export declare function copyCodeSource(code: string): Promise<boolean>;
/** Measure again on content/layout updates; dispose observers with the native adapter. */
export declare function observeCodeOverflow(element: HTMLPreElement, changed: (overflowing: boolean) => void): () => void;
