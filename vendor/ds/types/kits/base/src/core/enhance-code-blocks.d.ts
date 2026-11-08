/**
 * Activate copy feedback and keyboard scrolling on server-rendered CodeBlocks
 * without loading a framework. Labels come from the native SSR contract.
 * Repeated calls skip blocks already owned by an enhancer. The returned cleanup
 * restores those this call activated; dispose it before hydrating the same DOM.
 * Call again after inserting new static blocks. Does not observe DOM mutations.
 */
export declare function enhanceCodeBlocks(root?: ParentNode): () => void;
