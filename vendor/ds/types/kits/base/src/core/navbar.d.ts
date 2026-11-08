export type NavbarCollapse = "responsive" | "expanded" | "collapsed";
export type NavbarAlign = "start" | "center";
export declare const NAVBAR_ALIGNMENTS: readonly ["start", "center"];
export declare const NAVBAR_COLLAPSE: readonly ["responsive", "expanded", "collapsed"];
export interface NavbarArrangements {
    rail: boolean;
    compact: boolean;
}
/** Decide arrangements without consulting viewport state in JavaScript. */
export declare function arrangements(collapse: NavbarCollapse): NavbarArrangements;
export interface NavbarLink {
    id: string;
    label: string;
    href?: string;
    current?: boolean | "page" | "step" | "location" | "date" | "time" | "true";
    active?: boolean;
    disabled?: boolean;
    onselect?: () => void;
}
