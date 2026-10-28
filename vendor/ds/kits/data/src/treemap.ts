import { automaticChartPalette, chartColorToken } from "./core/chart-color";
import { finite, unique, type VisualizationItem } from "./visualization";
export interface TreemapNode extends VisualizationItem { value?:number; children?:readonly TreemapNode[] }
export function treemapNodes(data:TreemapNode):TreemapNode[] {
  const all:TreemapNode[]=[],active=new Set<TreemapNode>();
  function visit(node:TreemapNode) {if(active.has(node))throw new Error("Cyclic treemap hierarchy");active.add(node);all.push(node);if(node.value!==undefined&&finite(node.value,node.id)<0)throw new Error("Treemap values must be non-negative");for(const c of node.children??[])visit(c);active.delete(node);}
  visit(data);unique(all,"Treemap");
  const automatic = automaticChartPalette(all.filter(node => !node.children?.length));
  const copies = new Map(all.map(node => [node.id, { ...node, color: chartColorToken(node, undefined, automatic) }]));
  for (const node of all) if (node.children) copies.get(node.id)!.children = node.children.map(child => copies.get(child.id)!);
  return all.map(node => copies.get(node.id)!);
}
