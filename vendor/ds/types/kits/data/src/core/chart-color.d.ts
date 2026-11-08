import { type ColorToken, type ChartPalette } from "@reddb-io/design-system/base/recipes";
export type { ColorToken, ChartPalette };
/** Ten categorical positions for up to ten competing entities. Scheme-aware tokens. */
export declare const CHART_PALETTE_10: readonly ColorToken[];
/** Forty categorical positions; the first ten match the smaller package. */
export declare const CHART_PALETTE_40: readonly ColorToken[];
/** Select by competing identities, never by the number of samples in a series. */
export declare function chartPaletteFor(count: number): readonly ColorToken[];
type ColorItem = {
    id?: string;
    color?: ColorToken;
    series?: number;
};
/** Collision-free through forty entities. Sorting the same identity set never reassigns a color.
 * Different identity sets may remap: pass a shared palette for cross-chart/live identity persistence.
 * Above forty positions repeat; labels/selection remain necessary.
 */
export declare function automaticChartPalette(items: readonly {
    id: string;
}[]): ChartPalette;
/** Explicit token, application palette, explicit legacy role, then automatic token. */
export declare function chartColorToken(item: ColorItem, palette?: ChartPalette, automatic?: ChartPalette): ColorToken | undefined;
/** Resolve once for plot, legend and readout in both native implementations. */
export declare function chartColor(item: ColorItem, palette?: ChartPalette, automatic?: ChartPalette): string;
/** Supply token colors to models whose renderers already consume seriesColor. */
export declare function automaticChartColors<T extends {
    id: string;
    color?: ColorToken;
    series?: number;
}>(items: readonly T[]): T[];
