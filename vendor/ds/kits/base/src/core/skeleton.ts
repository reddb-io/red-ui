import type { SkeletonShape } from "../skeleton.variants";

/** Passive geometry, shared by Svelte and React without a chart engine. */
export interface SkeletonNode {
  tag: "rect" | "circle" | "path" | "line";
  attrs: Readonly<Record<string, string | number>>;
}
export interface SkeletonGeometry {
  width: number;
  height: number;
  nodes: readonly SkeletonNode[];
  tracks?: string;
}

function count(value: number, name: string, max: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RangeError(`Skeleton ${name} must be an integer from 1 to ${max}`);
  }
  return value;
}

/** Validates counts before allocating geometry in either native renderer. */
export function skeletonCounts(rows = 5, columns = 4) {
  return { rows: count(rows, "rows", 20), columns: count(columns, "columns", 12) };
}

const geometryCache = new Map<string, SkeletonGeometry>();
const markupCache = new WeakMap<SkeletonGeometry, string>();

export function skeletonGeometry(shape: SkeletonShape, rows = 5, columns = 4): SkeletonGeometry | undefined {
  skeletonCounts(rows, columns);
  if (shape === "text" || shape === "rectangle" || shape === "circle") return undefined;
  const key = `${shape}:${shape === "table" || shape === "heatmap" || shape === "list" ? rows : 0}:${shape === "table" || shape === "heatmap" ? columns : 0}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const nodes: SkeletonNode[] = [];
  const add = (tag: SkeletonNode["tag"], attrs: SkeletonNode["attrs"], part?: string) =>
    nodes.push({ tag, attrs: { ...attrs, ...(part ? { "data-skeleton-part": part } : {}) } });
  const rect = (x: number, y: number, width: number, height: number, part?: string) =>
    add("rect", { x, y, width, height, rx: 4, fill: "var(--reddb-color-muted)" }, part);
  const line = (x1: number, y1: number, x2: number, y2: number, width = 8) =>
    add("line", { x1, y1, x2, y2, stroke: "var(--reddb-color-muted)", strokeWidth: width, strokeLinecap: "round" });
  const circle = (cx: number, cy: number, r: number) => add("circle", { cx, cy, r, fill: "var(--reddb-color-muted)" });
  const path = (d: string, fill = "none", width = 8) =>
    add("path", { d, fill, stroke: "var(--reddb-color-muted)", strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round" });
  let width = 480, height = 240;

  switch (shape) {
    case "table": {
      height = (rows + 1) * 32 + 16;
      const cell = 464 / columns;
      for (let col = 0; col < columns; col++) rect(8 + col * cell, 8, cell - 8, 18, "header");
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        rect(8 + col * cell, 40 + row * 32, (cell - 8) * (col === 0 ? 0.65 : 0.85), 12, "cell");
      }
      break;
    }
    case "kpi":
      rect(16, 24, 180, 18, "label"); rect(16, 72, 260, 64, "value");
      rect(16, 178, 110, 18, "comparison"); rect(142, 178, 160, 18, "context");
      break;
    case "bar":
      [244, 326, 278, 358, 220, 300].forEach((length, i) => {
        rect(8, 12 + i * 38, 64, 12, "category"); rect(96, 8 + i * 38, length, 22, "mark");
      });
      break;
    case "combo":
    case "column":
      [92, 142, 116, 182, 130, 162].forEach((h, i) => {
        rect(34 + i * 74, 208 - h, 40, h, "mark"); rect(34 + i * 74, 224, 40, 8, "category");
      });
      if (shape === "combo") path("M16 130C90 130 140 56 224 86S360 36 464 20", "none", 8);
      break;
    case "line":
    case "area": {
      const curve = "M16 172C60 172 72 116 116 124S180 178 224 114S294 126 340 76S414 96 464 32";
      if (shape === "area") path(`${curve}L464 224H16Z`, "var(--reddb-color-muted)", 0);
      else path(curve, "none", 10);
      rect(16, 232, 56, 8); rect(208, 232, 56, 8); rect(408, 232, 56, 8);
      break;
    }
    case "pie":
      width = height = 240;
      // Equal neutral sectors convey a format, never measured proportions.
      for (let i = 0; i < 3; i++) {
        const a = (i * 120 - 86) * Math.PI / 180, b = (i * 120 + 26) * Math.PI / 180;
        const point = (angle: number) => `${+(120 + 96 * Math.cos(angle)).toFixed(3)} ${+(120 + 96 * Math.sin(angle)).toFixed(3)}`;
        path(`M120 120L${point(a)}A96 96 0 0 1 ${point(b)}Z`, "var(--reddb-color-muted)", 0);
      }
      break;
    case "donut":
    case "radial":
      width = height = 240;
      add("circle", { cx: 120, cy: 120, r: 94, fill: "none", stroke: "var(--reddb-color-muted)", strokeWidth: shape === "donut" ? 28 : 10, ...(shape === "donut" ? { strokeDasharray: "185 12", transform: "rotate(-90 120 120)" } : {}) }, "ring");
      rect(82, 105, 76, 22, "value"); rect(94, 141, 52, 10, "label");
      break;
    case "candlestick":
      [84, 110, 62, 90, 46, 70].forEach((y, i) => {
        line(54 + i * 74, y - 26, 54 + i * 74, y + 98, 5);
        rect(34 + i * 74, y, 40, 58, "mark");
      });
      break;
    case "scatter":
      [[36,182],[94,148],[126,184],[178,106],[224,136],[260,68],[310,104],[350,48],[400,72],[448,30]].forEach(([x,y]) => circle(x!, y!, 10));
      break;
    case "heatmap": {
      const cellWidth = 464 / columns;
      height = rows * 32 + 16;
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) rect(8 + col * cellWidth, 8 + row * 32, cellWidth - 8, 24, "cell");
      break;
    }
    case "graph":
      [[70,62,232,32],[70,62,180,180],[232,32,390,100],[232,32,180,180],[180,180,390,100],[390,100,420,206]].forEach(([x1,y1,x2,y2]) => line(x1!, y1!, x2!, y2!, 6));
      [[70,62],[232,32],[180,180],[390,100],[420,206]].forEach(([x,y]) => circle(x!, y!, 22));
      break;
    case "list":
      height = rows * 60 + 16;
      for (let row = 0; row < rows; row++) {
        circle(32, 34 + row * 60, 22); rect(76, 16 + row * 60, 240, 14); rect(76, 40 + row * 60, 150, 10); rect(400, 28 + row * 60, 64, 12);
      }
      break;
    case "document":
      rect(16, 12, 240, 24, "title");
      [440,412,448,320,432,400,280].forEach((w, i) => rect(16, 60 + i * 26, w, 12, "line"));
      break;
    case "card":
      rect(8, 8, 464, 130, "media"); rect(8, 158, 280, 20, "title"); rect(8, 198, 420, 12); rect(8, 224, 324, 12);
      break;
  }
  // Empty Density-sized grid tracks reserve space without spacer elements.
  // A caller's height class still controls the outer box and its absolute SVG.
  const circular = shape === "pie" || shape === "donut" || shape === "radial";
  const trackCount = shape === "table" ? rows + 1 : shape === "list" || shape === "heatmap" ? rows : shape === "kpi" ? 5 : shape === "card" ? 10 : 8;
  const rowHeight = shape === "list" ? "var(--reddb-spatial-control-height-lg)" : "var(--reddb-spatial-control-height-md)";
  const geometry = Object.freeze({ width, height, nodes: Object.freeze(nodes.map(node => Object.freeze({ ...node, attrs: Object.freeze(node.attrs) }))), tracks: circular ? undefined : `repeat(${trackCount}, ${rowHeight})` });
  if (geometryCache.size >= 64) geometryCache.delete(geometryCache.keys().next().value!);
  geometryCache.set(key, geometry);
  return geometry;
}

/** SVG attributes use dash spelling in Svelte/HTML and native camel spelling in React. */
export function skeletonSvgAttributes(node: SkeletonNode) {
  return Object.fromEntries(Object.entries(node.attrs).map(([name, value]) => [name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), value]));
}

/** Serialize only DS-generated, passive geometry; no caller markup or events enter this boundary. */
export function skeletonSvgMarkup(geometry: SkeletonGeometry | undefined): string {
  if (!geometry) return "";
  const cached = markupCache.get(geometry);
  if (cached !== undefined) return cached;
  const escape = (value: string | number) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const allowed = /^(?:x|y|x1|x2|y1|y2|width|height|rx|cx|cy|r|d|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|transform|data-skeleton-part)$/;
  const markup = geometry.nodes.map(node => {
    if (!["rect", "circle", "path", "line"].includes(node.tag)) throw new Error("Skeleton requires passive SVG geometry");
    const attrs = Object.entries(skeletonSvgAttributes(node)).map(([name, value]) => {
      if (!allowed.test(name)) throw new Error("Skeleton requires passive SVG attributes");
      return ` ${name}="${escape(value)}"`;
    }).join("");
    return `<${node.tag}${attrs}></${node.tag}>`;
  }).join("");
  markupCache.set(geometry, markup);
  return markup;
}
