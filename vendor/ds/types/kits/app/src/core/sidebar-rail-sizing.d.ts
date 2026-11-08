import type { SidebarRailSizing } from "./contracts/sidebarrail";
type Style = Record<string, string>;
/** Runtime geometry belongs to explicit caller values; default classes keep their Density roles. */
export declare function sidebarRailSizing(sizing: SidebarRailSizing, labelled?: boolean): {
    root: Style;
    item: Style;
    face: Style;
    glyph: Style;
    label: Style;
    list: Style;
};
/** Svelte's native style attribute uses the same declarations as React's CSSProperties. */
export declare function sidebarRailStyle(style: Style): string | undefined;
export {};
