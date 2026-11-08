import type { Mark } from "./logo.marks";
/** Clearspace is 25% of the symbol's height (ADR 0004). */
export declare const CLEARSPACE_RATIO = 0.25;
/**
 * The floor under the symbol, in CSS pixels. Below it the wordmark's counters
 * close up and the notch in the symbol stops reading, so it is an error rather
 * than a smaller Logo.
 */
export declare const MINIMUM_SYMBOL_PX = 16;
/** What `size` means when a caller does not say: comfortable, not minimal. */
export declare const DEFAULT_SYMBOL_PX = 32;
/** The Logo's laid-out geometry, in CSS pixels. */
export interface LogoBox {
    /** The symbol's height — the size the caller asked for. */
    symbol: number;
    /** Clearspace on every side. */
    clearspace: number;
    /** The Mark itself, inside the clearspace. */
    markWidth: number;
    markHeight: number;
    /** The component's own box: the Mark plus clearspace on all four sides. */
    width: number;
    height: number;
}
/**
 * The refusal for a Logo asked to render below the minimum.
 *
 * ADR 0004 calls it a dev error, and an error is what it is: a Logo that
 * renders illegibly is worse than a page with a hole in it, because nobody
 * files the second one as a bug against the DS.
 */
export declare class LogoTooSmallError extends Error {
    /** The symbol height that was asked for, in CSS pixels. */
    readonly size: number;
    /** The floor it fell under. */
    readonly minimum: number;
    constructor(size: number, minimum?: number);
}
/**
 * The box `mark` occupies when its symbol is `size` pixels tall.
 *
 * Throws rather than clamping when `size` is below the minimum or is not a
 * usable length: clamping would render a Logo nobody asked for, and silence is
 * how a below-minimum Logo ships.
 */
export declare function logoBox(mark: Mark, size?: number): LogoBox;
/**
 * The smallest `size` a Mark may be placed at. One number for every Mark,
 * because the floor is under the symbol and the symbol is shared.
 */
export declare function minimumSize(): number;
/**
 * A length as CSS, rounded to a resolution finer than a device pixel.
 *
 * The Marks' viewBoxes carry three decimals, so the arithmetic above produces
 * numbers like 120.62144 — real, and not worth the bytes. Rounding here rather
 * than in `logoBox` keeps the box exact for anyone computing with it.
 */
export declare function px(length: number): string;
