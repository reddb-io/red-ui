// Renderer registry — registers the bundled renderers on import.
//
// Consumers should import { registry } from this module rather than
// going through ./registry directly, so this side-effect runs and the
// renderers are always available.

import { registry, RendererRegistry } from "./registry";
import { tableRenderer } from "./table";
import { graphRenderer } from "./graph";
import { kvRenderer } from "./kv";
import { hypertableRenderer } from "./hypertable";
import { jsonRenderer } from "./json";
import { vectorRenderer } from "./vector";
import { queueRenderer } from "./queue";
import { statsRenderer } from "./stats";
import { diffRenderer } from "./diff";
import { documentRenderer } from "./document";

const bundledRenderers = [
  tableRenderer,
  graphRenderer,
  kvRenderer,
  hypertableRenderer,
  vectorRenderer,
  queueRenderer,
  statsRenderer,
  diffRenderer,
  documentRenderer,
  jsonRenderer,
];

/** Registrations belong to a workspace; renderer definitions are immutable. */
export function createRendererRegistry(): RendererRegistry {
  const next = new RendererRegistry();
  for (const renderer of bundledRenderers) next.register({ ...renderer });
  return next;
}

// Preserve the published registry for consumers outside a mounted Workspace.
for (const renderer of bundledRenderers) registry.register(renderer);

export { registry, RendererRegistry } from "./registry";
export type { Capability, CapabilityRenderer, RendererProps } from "./types";
export { tableRenderer } from "./table";
export { graphRenderer } from "./graph";
export { kvRenderer } from "./kv";
export { hypertableRenderer } from "./hypertable";
export { jsonRenderer } from "./json";
export { vectorRenderer } from "./vector";
export { queueRenderer } from "./queue";
export { statsRenderer } from "./stats";
export { diffRenderer } from "./diff";
export { documentRenderer } from "./document";
export * from "./table-render";
