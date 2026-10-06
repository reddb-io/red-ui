import type { IconGlyph } from "./Icon.svelte";

/** One selectable row in a DropdownMenu. */
export interface DropdownMenuItem {
  id: string;
  label: string;
  /** Optional decorative glyph rendered before the label through the DS Icon contract. */
  icon?: IconGlyph;
  /** A keyboard shortcut rendered as semantic key caps after the label. */
  shortcut?: readonly string[];
  href?: string;
  disabled?: boolean;
  onselect?: () => void;
}

/** A named or unnamed run of related menu rows. */
export interface DropdownMenuGroup {
  heading?: string;
  items: readonly DropdownMenuItem[];
}

export type DropdownMenuEntry = DropdownMenuItem | DropdownMenuGroup;

export function isDropdownMenuGroup(entry: DropdownMenuEntry): entry is DropdownMenuGroup {
  return Array.isArray((entry as DropdownMenuGroup).items);
}

/** Fold consecutive bare rows into groups while retaining explicit group boundaries. */
export function dropdownMenuGroups(
  entries: readonly DropdownMenuEntry[],
): readonly DropdownMenuGroup[] {
  const groups: DropdownMenuGroup[] = [];
  let run: DropdownMenuItem[] | undefined;

  for (const entry of entries) {
    if (isDropdownMenuGroup(entry)) {
      run = undefined;
      if (entry.items.length > 0) groups.push(entry);
      continue;
    }
    if (run === undefined) {
      run = [];
      groups.push({ items: run });
    }
    run.push(entry);
  }

  return groups;
}

/** Flatten grouped entries back into their source-order menu rows. */
export function dropdownMenuItems(
  entries: readonly DropdownMenuEntry[],
): readonly DropdownMenuItem[] {
  return dropdownMenuGroups(entries).flatMap((group) => [...group.items]);
}
