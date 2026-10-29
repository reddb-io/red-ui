import type { Capability } from "./renderers";

export function defaultSubpage(capability: Capability | undefined): string {
  if (!capability) return "table";
  if (capability === "graph") return "graph";
  return capability;
}

export function subpageCapability(
  subpage: string | undefined,
  fallback: Capability | undefined
): Capability | undefined {
  switch (subpage) {
    case "graph":
    case "svg":
      return "graph";
    case "table":
      return "table";
    case "json":
      return "json";
    case "hypertable":
    case "kv":
    case "vector":
    case "queue":
    case "stats":
    case "diff":
    case "document":
      return subpage;
    default:
      return fallback;
  }
}

export function collectionPageHref(
  collection: string,
  subpage: string
): string {
  return `/c/${encodeURIComponent(collection)}/p/${encodeURIComponent(subpage)}`;
}

/** An explicit override wins; JSON routes also select the universal renderer. */
export function rendererSelection(
  subpage: string | undefined,
  override: Capability | undefined,
  emptyCapability: Capability | undefined
): Capability | undefined {
  return (
    override ?? (subpage === "json" ? "json" : undefined) ?? emptyCapability
  );
}
