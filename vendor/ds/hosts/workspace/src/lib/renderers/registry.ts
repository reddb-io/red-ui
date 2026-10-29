// RedDB's renderer registrations adapt their result and Svelte components to
// the portable, instance-owned App Kit registry.
import { WorkspaceRendererRegistry } from "@reddb-io/design-system/app/workspace/renderers";
import type { QueryResult } from "../reddb/index";
import type { Capability, CapabilityRenderer } from "./types";

export class RendererRegistry extends WorkspaceRendererRegistry<
  Capability,
  QueryResult,
  CapabilityRenderer
> {
  /** Keep the public red-ui selection and missing-table behavior. */
  pick(
    capability: Capability | undefined,
    result: QueryResult,
    override?: Capability
  ): CapabilityRenderer {
    const renderer = this.resolve(capability, result, override, "table");
    if (!renderer)
      throw new Error(
        "No renderer matched and no table fallback is registered"
      );
    return renderer;
  }
}

/** Compatibility singleton; mounted workspaces own their own registry. */
export const registry = new RendererRegistry();
