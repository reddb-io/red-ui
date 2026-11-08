/** Resolve before the first popup render so native modal portals never mount on body first. */
export declare function modalPortalContainer(source: HTMLElement): HTMLElement | undefined;
/** The portal retains its source's independent appearance axes and native modal boundary. */
export declare function observePortalAppearance(source: HTMLElement, changed: (state: {
    attributes: Record<string, string>;
    container: HTMLElement | undefined;
}) => void): () => void;
