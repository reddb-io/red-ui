// Router abstraction for the Mountable Root.
//
// The Core (`Workspace`) must mount without owning `window.history` or the
// page URL (ADR-0001). Navigation between its top-level views is expressed
// as a structured `RouteTarget` and resolved by an injected `Router`:
//
//   - `createStateRouter()` keeps the location in component state and never
//     touches the URL — this is the default the Mountable Root uses when no
//     router is injected, so it can be embedded in a host that owns the page.
//   - The SvelteKit surface injects a Kit-backed router (see
//     `src/routes/kit-router.svelte.ts`) that reads `page.url` and `goto()`s,
//     so the full app keeps deep links, refresh, and the back button.
//
// Both implementations satisfy the same `Router` contract, so every view
// component navigates the same way regardless of which Surface it runs in.

import { getContext, setContext } from "svelte";
import { collectionPageHref } from "./collection-pages";

/** The top-level destinations of the Mountable Root. */
export type View =
  | "query"
  | "collections"
  | "cluster"
  | "security"
  | "settings";

/**
 * A navigation intent. `collection` carries a selected collection + subpage
 * within the collections workspace; the other targets are the bare views.
 */
export type RouteTarget =
  | { view: "query" }
  | { view: "collections" }
  | { view: "cluster" }
  | { view: "security" }
  | { view: "settings" }
  | { view: "collection"; collection: string; subpage: string };

/** Resolved current location, the reactive surface views read from. */
export interface RouteLocation {
  view: View;
  /** Selected collection when inside the collections workspace, else null. */
  collection: string | null;
  /** Selected collection subpage (`table`, `graph`, …), else null. */
  subpage: string | null;
}

export interface Router {
  /** Current top-level view. */
  readonly view: View;
  /** Selected collection, or null. */
  readonly collection: string | null;
  /** Selected collection subpage, or null. */
  readonly subpage: string | null;
  /** Canonical path for the current location (mirrors the SvelteKit URL). */
  readonly path: string;
  /** The canonical href a `RouteTarget` maps to (for `<a href>` display). */
  href(target: RouteTarget): string;
  /**
   * Navigate to a target. When called from an anchor `onclick`, pass the
   * event so the router can `preventDefault()` (state router) or honour
   * modifier-clicks for open-in-new-tab (Kit router). `replace` swaps the
   * current history entry instead of pushing (Kit only; ignored by state).
   */
  go(target: RouteTarget, event?: Event, replace?: boolean): void;
}

/** Map a `RouteTarget` to its canonical path. */
export function targetToHref(target: RouteTarget): string {
  switch (target.view) {
    case "query":
      return "/query";
    case "collections":
      return "/collections";
    case "cluster":
      return "/cluster";
    case "security":
      return "/security";
    case "settings":
      return "/settings";
    case "collection":
      return collectionPageHref(target.collection, target.subpage);
  }
}

/** Map a `RouteTarget` to a resolved location. */
export function targetToLocation(target: RouteTarget): RouteLocation {
  if (target.view === "collection") {
    return {
      view: "collections",
      collection: target.collection,
      subpage: target.subpage,
    };
  }
  return { view: target.view, collection: null, subpage: null };
}

/**
 * Derive a location from a SvelteKit pathname. Mirrors the `routes/` tree:
 * `/query`, `/cluster`, `/security`, `/c/<name>/p/<subpage>`, and `/` or
 * `/collections` for the bare collections workspace.
 */
export function pathToLocation(pathname: string): RouteLocation {
  if (pathname.startsWith("/query"))
    return { view: "query", collection: null, subpage: null };
  if (pathname.startsWith("/cluster"))
    return { view: "cluster", collection: null, subpage: null };
  if (pathname.startsWith("/security"))
    return { view: "security", collection: null, subpage: null };
  if (pathname.startsWith("/settings"))
    return { view: "settings", collection: null, subpage: null };
  const m = pathname.match(/^\/c\/([^/]+)(?:\/p\/([^/]+))?/);
  if (m) {
    return {
      view: "collections",
      collection: decodeURIComponent(m[1]),
      subpage: m[2] ? decodeURIComponent(m[2]) : null,
    };
  }
  return { view: "collections", collection: null, subpage: null };
}

/**
 * A router that lives entirely in component state — it never reads or writes
 * the URL. This is what the Mountable Root uses standalone, so embedding in a
 * host that owns the page never fights over `window.history`.
 */
export function createStateRouter(initial?: RouteLocation): Router {
  let loc = $state<RouteLocation>(
    initial ?? { view: "collections", collection: null, subpage: null }
  );
  return {
    get view() {
      return loc.view;
    },
    get collection() {
      return loc.collection;
    },
    get subpage() {
      return loc.subpage;
    },
    get path() {
      return targetToHref(
        loc.collection
          ? {
              view: "collection",
              collection: loc.collection,
              subpage: loc.subpage ?? "table",
            }
          : { view: loc.view }
      );
    },
    href: (target) => targetToHref(target),
    go: (target, event) => {
      // The href is synthetic in state mode, so always suppress the anchor's
      // default navigation and switch the in-memory location instead.
      event?.preventDefault();
      loc = targetToLocation(target);
    },
  };
}

const ROUTER_KEY = Symbol("red-ui-router");

let fallbackRouter: Router | null = null;

/** Provide a router to descendant view components (called by the Mountable Root). */
export function setRouter(router: Router): Router {
  setContext(ROUTER_KEY, router);
  return router;
}

/**
 * Read the router from context. Falls back to a shared state router when a
 * component is used outside a Mountable Root, so views never crash for the
 * lack of a provider.
 */
export function useRouter(): Router {
  const router = getContext<Router | undefined>(ROUTER_KEY);
  if (router) return router;
  if (!fallbackRouter) fallbackRouter = createStateRouter();
  return fallbackRouter;
}
