/** A host-supplied presentation for one kind of workspace result. */
export interface WorkspaceRenderer<Key extends string, Result> {
    /** Stable identifier used for registration, hints and overrides. */
    capability: Key;
    /** Whether the renderer can present this result. */
    renders(result: Result): boolean;
}
/** Independent registry; the host supplies renderer implementations and data. */
export declare class WorkspaceRendererRegistry<Key extends string, Result, Renderer extends WorkspaceRenderer<Key, Result>> {
    private renderers;
    /** Register or replace a capability without changing its precedence. */
    register(renderer: Renderer): void;
    /** Remove a registered capability. */
    unregister(capability: Key): void;
    /** Remove all registrations from this registry. */
    clear(): void;
    /** List registrations in matching precedence order. */
    list(): readonly Renderer[];
    /** Check whether a capability is registered. */
    has(capability: Key): boolean;
    /** Select override, compatible hint, first matching shape, then fallback. */
    resolve(hint: Key | undefined, result: Result, override?: Key, fallback?: Key): Renderer | undefined;
}
