import { tokenColor, type ColorToken } from "./color-token";

/** Only passive SVG geometry is admitted in an illustration asset. */
export type IllustrationTag = "g" | "path" | "circle" | "ellipse" | "rect" | "line" | "polyline" | "polygon";
/** A small tree of static geometry; it never contains text, scripts, HTML or remote resources. */
export interface IllustrationNode {
  /** Passive SVG element. */
  readonly tag: IllustrationTag;
  /** Geometry and token-backed paint attributes. */
  readonly attrs: Readonly<Record<string, string>>;
  /** Nested geometry, used for transforms. */
  readonly children?: readonly IllustrationNode[];
}
/** Import a named asset from base/illustrations; its geometry is shared across frameworks. */
export interface StateIllustrationAsset {
  /** Stable identity for exports and downloads. */
  readonly name: string;
  /** Short English catalogue label, separate from application copy. */
  readonly label: string;
  /** Meaning and suggested use, never inserted into the illustration. */
  readonly description: string;
  /** Passive geometry, with a 480 by 300 viewBox. */
  readonly nodes: readonly IllustrationNode[];
}
const tags = new Set(["g","path","circle","ellipse","rect","line","polyline","polygon"]);
const attributes = new Set(["d","x","y","x1","y1","x2","y2","cx","cy","r","rx","ry","width","height","points","transform","fill","stroke","strokeWidth","strokeLinecap","strokeLinejoin","strokeDasharray","fillOpacity","strokeOpacity","opacity"]);
function validateNodes(nodes: readonly IllustrationNode[]): void {
  for(const node of nodes){
    if(!tags.has(node.tag))throw new Error(`Unsupported illustration element: ${node.tag}`);
    for(const [key,value] of Object.entries(node.attrs)) if(!attributes.has(key)||typeof value!=="string"||/[<>]|\b(?:url|expression)\s*\(|javascript:/i.test(value))throw new Error(`Unsupported illustration attribute: ${key}`);
    if(node.children)validateNodes(node.children);
  }
}
/** Internal asset constructor. Public consumers import named, frozen assets. */
export function defineStateIllustration(asset: StateIllustrationAsset): StateIllustrationAsset {
  validateNodes(asset.nodes);
  const freeze=(nodes:readonly IllustrationNode[])=>{for(const node of nodes){if(node.children)freeze(node.children);Object.freeze(node.attrs);Object.freeze(node);}Object.freeze(nodes);};freeze(asset.nodes);
  return Object.freeze(asset);
}
/** Validate geometry at the render boundary, including after server/client serialization. */
export function illustrationNodes(asset: StateIllustrationAsset): readonly IllustrationNode[] {
  if(!asset||!Array.isArray(asset.nodes)||!asset.name)throw new Error("StateIllustration requires a named illustration asset");
  validateNodes(asset.nodes);return asset.nodes;
}
/** Apply an optional colour token without changing the source asset. */
export function illustrationAttributes(node: IllustrationNode, accent?: ColorToken): Record<string,string> {
  const paint=tokenColor(accent,"var(--reddb-color-primary,currentColor)");
  return Object.fromEntries(Object.entries(node.attrs).map(([key,value])=>[key.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`),value==="var(--reddb-color-primary,currentColor)"?paint:value]));
}
const escape=(value:string)=>value.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
/** Standalone, transparent SVG source, with no framework, fonts or external resources. */
export function illustrationSvg(asset: StateIllustrationAsset, accent?: ColorToken): string {
  const render=(nodes:readonly IllustrationNode[]):string=>nodes.map(node=>{const attrs=Object.entries(illustrationAttributes(node,accent)).map(([key,value])=>` ${key}="${escape(value)}"`).join("");return node.children?.length?`<${node.tag}${attrs}>${render(node.children)}</${node.tag}>`:`<${node.tag}${attrs}/>`;}).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300" aria-hidden="true" focusable="false">${render(illustrationNodes(asset))}</svg>\n`;
}
