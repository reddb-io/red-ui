// SvelteKit-backed router for the full app Surface.
//
// This is the ONLY place (besides the route `+page.svelte` files) that touches
// `$app/*`. Keeping it under `routes/` rather than `$lib/` is deliberate: the
// published Core (`src/lib/index.ts`) must not pull in SvelteKit, so the Kit
// adapter is injected from the app Surface instead of living in the Core.
//
// It derives the location from `page.url` and navigates with `goto()`, so the
// URL, deep links, refresh, and the back button all keep working.

import { goto } from '$app/navigation'
import { page } from '$app/state'
import { base } from '$app/paths'
import {
  pathToLocation,
  targetToHref,
  type Router,
  type RouteTarget,
} from '$lib/router.svelte'

/** True when a click should fall through to the browser (new tab, etc.). */
function isModifiedClick(event?: Event): boolean {
  if (!(event instanceof MouseEvent)) return false
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

export function createKitRouter(): Router {
  const location = $derived(pathToLocation(page.url.pathname.slice(base.length) || '/'))
  return {
    get view() {
      return location.view
    },
    get collection() {
      return location.collection
    },
    get subpage() {
      return location.subpage
    },
    get path() {
      return page.url.pathname
    },
    href: (target) => base + targetToHref(target),
    go: (target, event, replace) => {
      // Let the browser handle modifier-clicks so "open in new tab" still
      // works on real anchors; otherwise take over the navigation.
      if (isModifiedClick(event)) return
      event?.preventDefault()
      void goto(base + targetToHref(target), { replaceState: replace ?? false })
    },
  }
}
