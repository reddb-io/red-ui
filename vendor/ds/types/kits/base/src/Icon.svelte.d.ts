import type { LucideProps } from "@lucide/svelte";
import type { Component } from "svelte";
/*! @license Built-in icon geometry: Copyright (c) 2026 Lucide Icons and Contributors.
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
export { ICON_SIZES, ICON_COLORS, type IconSize, type IconColor } from "./core/icon";
import { type IconColor, type IconSize, type DeprecatedIconColor } from "./core/icon";
export type IconGlyphProps = LucideProps;
export type IconGlyph = Component<IconGlyphProps>;
import type { SVGAttributes } from "svelte/elements";
interface Props extends Omit<SVGAttributes<SVGSVGElement>, "color" | "height" | "stroke" | "stroke-width" | "width"> {
    /** A consumer-supplied Lucide glyph, or a built-in glyph without loading the optional icon package. */
    icon: IconGlyph | "menu" | "chevron-down" | "x" | "maximize" | "restore" | "mic";
    /** Density-responsive DS size. */
    size?: IconSize;
    /**
     * Semantic Theme color; raw color values are deliberately not accepted.
     * `current` inherits the surrounding ink, so a glyph follows its control's
     * hover and selected states or a caller's token-backed text class.
     * `muted` is a deprecated alias that draws in `ink-muted` for one release.
     */
    color?: IconColor | DeprecatedIconColor;
}
declare const Icon: Component<Props, {}, "">;
type Icon = ReturnType<typeof Icon>;
export default Icon;
