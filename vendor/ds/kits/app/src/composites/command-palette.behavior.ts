/** One caller-owned command offered by the global command search. */
export interface CommandPaletteCommand {
  /** Stable identity returned when the command is selected. */
  id: string;
  /** Visible, searchable command name. */
  label: string;
  /** Visible category heading; commands retain their order within each category. */
  group?: string;
  /** Supporting, searchable explanation or destination. */
  description?: string;
  /** Visual shortcut reference; registration remains caller-owned. */
  shortcut?: readonly string[];
  /** Additional search terms, never rendered as labels. */
  keywords?: readonly string[];
  /** Removes only this command from interaction and selection. */
  disabled?: boolean;
  /** Caller-owned business action. */
  onselect?: () => void;
}

/** Stable grouping and shared search across both native adapters. */
export function commandGroups(commands: readonly CommandPaletteCommand[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  const groups = new Map<string, CommandPaletteCommand[]>();
  for (const command of commands) {
    if (normalized && ![command.label, command.description, command.group, ...(command.keywords ?? [])]
      .filter(Boolean).join(" ").toLocaleLowerCase().includes(normalized)) continue;
    const key = command.group ?? "";
    const group = groups.get(key) ?? [];
    group.push(command);
    groups.set(key, group);
  }
  return [...groups].map(([label, items]) => ({ label, items }));
}
