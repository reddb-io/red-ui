import { type LogoSurface } from "./logo.marks";
/** The attribute the Color Scheme selectors key on. */
export declare const COLOR_SCHEME_ATTRIBUTE = "data-color-scheme";
/** The surface a Color Scheme implies. Anything unrecognised is light. */
export declare function surfaceOfColorScheme(scheme: string | null | undefined): LogoSurface;
/** The surface implied by the active Color Scheme on `doc`. */
export declare function activeSurface(doc?: Document | null | undefined): LogoSurface;
/**
 * Observe root Color Scheme changes and report their implied Logo surface.
 * Returns a cleanup function; without a browser it reports once and is inert.
 */
export declare function observeActiveSurface(report: (surface: LogoSurface) => void, doc?: Document | null | undefined): () => void;
/** Is `value` a surface the Logo knows? */
export declare function isLogoSurface(value: unknown): value is LogoSurface;
