/**
 * The pinned Brand Assets release these Marks came from
 * (`vendor/brand/brand.lock.json`).
 *
 * Written here as a literal because a Kit is vendorable source with no build
 * step and no lock to read at runtime — and kept honest rather than
 * remembered: `test/marks.test.ts` fails when it drifts from the lock, which
 * is the same edit re-vendoring makes anyway.
 */
export declare const BRAND_RELEASE = "2026.10.3";
/** How the Mark is laid out. */
export declare const LOGO_LAYOUTS: readonly ["horizontal", "stacked", "icon", "symbol", "wordmark"];
export type LogoLayout = (typeof LOGO_LAYOUTS)[number];
/**
 * The surface the Mark sits on — the local background, not the global Theme.
 * `light` takes the color Mark, `dark` takes the inverse one.
 */
export declare const LOGO_SURFACES: readonly ["light", "dark"];
export type LogoSurface = (typeof LOGO_SURFACES)[number];
/** One Mark as the release published it. */
export interface Mark {
    /** File name, exactly as the release names it. */
    file: string;
    /** The URL the bundler emitted for the file. */
    src: string;
    /** The drawing's own width, from its viewBox. */
    width: number;
    /** The drawing's own height, from its viewBox. */
    height: number;
    /**
     * How much of that height the SYMBOL — the red glyph — occupies.
     *
     * The symbol is the same drawing in every layout, which is what makes it the
     * thing to measure: clearspace is 25% of symbol height (ADR 0004), and one
     * minimum on the symbol gives every lockup a minimum without several numbers
     * anyone has to keep in step. In the horizontal, icon and symbol Marks the
     * symbol spans the full height; in the stacked one it sits above the
     * wordmark and occupies 100 of the drawing's 154.423 units. The standalone
     * wordmark has no symbol, so its own 71.4-unit ink box is the sizing
     * reference.
     */
    symbolHeight: number;
}
/**
 * Every Mark the pinned release ships, by layout and surface.
 *
 * The hole is the point: `icon` has no `dark` entry because the release
 * publishes no `reddb-icon-inverse.svg`. It is left absent rather than filled
 * with the color Mark, so the gap is a fact the type system and the refusal
 * both read off one place.
 */
export declare const MARKS: Readonly<Record<LogoLayout, Partial<Record<LogoSurface, Mark>>>>;
/**
 * Every SVG drawing the pinned release publishes.
 *
 * Most are selected by layout and surface through `MARKS`. The color symbol
 * and knockout symbol are treatments rather than surfaces: they belong in the
 * catalogue and ship byte-identically with the Kit, but do not invent a third
 * `on` value or silently displace the Brand's explicit black/light and
 * white/dark mapping.
 */
export declare const MARK_CATALOGUE: readonly Mark[];
/**
 * The refusal: the Logo was asked for a Mark the pinned release does not ship.
 *
 * It names the gap and the release, because those are the two things whoever
 * hits it needs — what is missing, and which release it is missing from — and
 * because the fix is upstream: the message is the first draft of the Brand
 * proposal.
 */
export declare class MarkNotShippedError extends Error {
    /** The layout that was asked for. */
    readonly layout: LogoLayout;
    /** The surface it was asked for. */
    readonly on: LogoSurface;
    /** The Assets release that ships no such Mark. */
    readonly release: string;
    constructor(layout: LogoLayout, on: LogoSurface, release?: string);
}
/**
 * The Mark for one layout on one surface, or a loud refusal when the release
 * ships none. Never falls back, never invents: those are the two failures the
 * licence forbids, so neither has a code path here.
 */
export declare function selectMark(layout: LogoLayout, on: LogoSurface): Mark;
/** Does the pinned release ship a Mark for this layout on this surface? */
export declare function shipsMark(layout: LogoLayout, on: LogoSurface): boolean;
