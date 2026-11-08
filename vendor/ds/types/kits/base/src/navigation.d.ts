import type { NavigationSeam } from "./core/navigation";
export { ownsSameOrigin, routableAnchor, type NavigationSeam } from "./core/navigation";
/** Provide `seam` to the components below (NavigationScope does this). */
export declare function setNavigation(seam: NavigationSeam): NavigationSeam;
/** The seam in force here, or `undefined` outside any NavigationScope. */
export declare function getNavigation(): NavigationSeam | undefined;
/** Establish an optional navigation disclosure scope for a page shell. */
export declare function provideNavigationDisclosures(): void;
/** Join the nearest shell's disclosure scope; standalone navigation stays independent. */
export declare function navigationDisclosure(close: () => void): {
    open: () => void;
    destroy: () => void;
} | undefined;
