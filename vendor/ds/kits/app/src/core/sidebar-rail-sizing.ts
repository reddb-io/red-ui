import type { SidebarRailSizing } from "./contracts/sidebarrail";

type Style = Record<string, string>;
/** Runtime geometry belongs to explicit caller values; default classes keep their Density roles. */
export function sidebarRailSizing(sizing: SidebarRailSizing, labelled = false): { root: Style; item: Style; face: Style; glyph: Style; label: Style; list: Style } {
  for (const prop of ["itemSize", "iconSize", "itemGap", "labelGap", "railWidth", "railPadding", "labelSize"] as const) {
    const value = sizing[prop], zero = prop === "itemGap" || prop === "labelGap" || prop === "railPadding";
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || (!zero && value === 0))) {
      throw new Error(`SidebarRail ${prop} must be a finite ${zero ? "non-negative" : "positive"} CSS-pixel value`);
    }
  }
  const px = (value: number) => `${value}px`;
  const size = sizing.itemSize === undefined ? "var(--reddb-spatial-control-height-md)" : px(sizing.itemSize);
  const hit = `max(${size},var(--reddb-spatial-target-min))`;
  const padding = sizing.railPadding === undefined ? "var(--reddb-spatial-inset-sm)" : px(sizing.railPadding);
  const root: Style = {}, item: Style = {}, face: Style = {}, glyph: Style = {}, label: Style = {}, list: Style = {};
  if (sizing.itemSize !== undefined || sizing.railWidth !== undefined || sizing.railPadding !== undefined) {
    const natural = `calc(${labelled ? `max(6.65em,${hit} * 2)` : hit} + 2 * ${padding})`;
    root.minWidth = `calc(${hit} + 2 * ${padding} + 1px)`;
    root.width = `max(${sizing.railWidth === undefined ? natural : px(sizing.railWidth)},calc(${hit} + 2 * ${padding} + 1px))`;
  }
  if (sizing.railPadding !== undefined) root.padding = px(sizing.railPadding);
  if (sizing.itemSize !== undefined) {
    item.minHeight = hit;
    if (labelled) { face.width = hit; face.height = hit; }
    else { item.width = hit; item.height = hit; }
  }
  if (sizing.iconSize !== undefined) glyph.width = glyph.height = `min(${px(sizing.iconSize)},calc(${hit} - 2px))`;
  if (sizing.labelSize !== undefined) label.fontSize = px(sizing.labelSize);
  if (labelled && sizing.labelGap !== undefined) item.gap = px(sizing.labelGap);
  if (sizing.itemGap !== undefined) list.gap = px(sizing.itemGap);
  return { root, item, face, glyph, label, list };
}
/** Svelte's native style attribute uses the same declarations as React's CSSProperties. */
export function sidebarRailStyle(style: Style): string | undefined {
  return Object.entries(style).map(([name, value]) => `${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}:${value}`).join(";") || undefined;
}
