/** Renderer-owned attachment and state over the portable portal boundary. */
export declare function portalAppearance(open: () => boolean): {
    anchor: {
        [x: symbol]: (element: HTMLElement) => () => void;
    };
    readonly attributes: Record<string, string>;
    readonly container: HTMLElement | undefined;
};
