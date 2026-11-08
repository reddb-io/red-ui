import type { HTMLAnchorAttributes, HTMLAttributes } from "svelte/elements";
import { type LogoLayout, type LogoSurface } from "./logo.marks";
interface Common {
    /** How the Mark is laid out. Defaults to `horizontal`. */
    layout?: LogoLayout;
    /**
     * The surface behind the Mark — the LOCAL background, not the Theme. A
     * dark hero on a light marketing page is `on="dark"`. Defaults from the
     * active Color Scheme.
     */
    on?: LogoSurface;
    /**
     * The symbol's height in CSS pixels — the red glyph, which is the same
     * drawing in every layout, so one number means the same thing across
     * layouts. The rendered box is larger by the clearspace on every side.
     */
    size?: number;
    /**
     * When the browser should fetch the Mark. `eager` by default, because the
     * Logo's commonest home is a masthead above the fold, where lazy would
     * defer the one image the page is identified by. A footer Logo is the case
     * for `lazy` — and it is the caller's to make, because the component
     * cannot see where it was placed.
     */
    loading?: "eager" | "lazy";
    /**
     * How the Mark's fetch is prioritised against the rest of the page. Left
     * to the browser by default; `high` is for the masthead Logo that should
     * not queue behind content below it.
     */
    fetchpriority?: "high" | "low" | "auto";
    /** Extra classes, merged over the component's own. */
    class?: string;
}
/** Without an `href`: the pure Mark — a footer, a chatbot avatar. */
interface MarkMode extends Common, Omit<HTMLAttributes<HTMLSpanElement>, "class"> {
    href?: never;
    label?: never;
}
/** With an `href`: the accessible home link, as a navbar wears it. */
interface LinkMode extends Common, Omit<HTMLAnchorAttributes, "class"> {
    /** Where it goes. Its presence is what makes this an <a>. */
    href: string;
    /**
     * What the link says it does, for anyone who cannot see the Mark. A
     * drawing has no text to fall back on, so the label is not optional — it
     * only has a default.
     */
    label?: string;
}
type Props = MarkMode | LinkMode;
declare const Logo: import("svelte").Component<Props, {}, "">;
type Logo = ReturnType<typeof Logo>;
export default Logo;
