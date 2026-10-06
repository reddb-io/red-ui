import type { IconGlyph } from "@reddb-io/design-system/base";

/** One destination shared by the Application Kit's navigation surfaces. */
export interface ApplicationNavigationItem {
  /** Stable identity and the value matched by a surface's required `currentId`. */
  id: string;
  /** Visible destination name. */
  label: string;
  /** Native destination, kept mandatory so navigation remains keyboard reachable. */
  href: string;
  /** Optional decorative glyph, drawn through the Base Icon contract beside the label. */
  icon?: IconGlyph;
  /** Present but unavailable and removed from the tab order by canonical NavItem. */
  disabled?: boolean;
  /** Optional consumer action performed when the destination is chosen. */
  onselect?: () => void;
}

/** A destination after the surface has resolved its single current item. */
export interface ResolvedApplicationNavigationItem extends ApplicationNavigationItem {
  current: boolean;
}

/** Resolve current-item state once, refusing ambiguous or missing identities. */
export function navigationItems(
  items: readonly ApplicationNavigationItem[],
  currentId: string,
): readonly ResolvedApplicationNavigationItem[] {
  const matches = items.filter((item) => item.id === currentId);
  if (matches.length !== 1) {
    throw new Error(`currentId "${currentId}" must identify exactly one navigation item`);
  }

  return items.map((item) => ({ ...item, current: item.id === currentId }));
}
