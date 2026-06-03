// Static settings sections for the minimal settings view. Kept framework-free
// (no Svelte imports) so the section list and the active-section resolver are
// trivially unit-testable. Icons are mapped in `SettingsView.svelte`, not here.

export interface SettingsSection {
  /** Stable identifier used as the active-section key (component state only). */
  id: string;
  /** Nav label. */
  label: string;
  /** One-line description shown under the section title. */
  blurb: string;
  /** Static body copy — proof of an end-to-end mount, not live data. */
  body: string;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "general",
    label: "General",
    blurb: "Workspace defaults for this red-ui instance.",
    body: "General preferences live here. This minimal section proves the two-pane shell mounts end-to-end; richer controls land in follow-up issues.",
  },
  {
    id: "connection",
    label: "Connection",
    blurb: "How red-ui reaches your reddb cluster.",
    body: "Connection settings will surface the active target, transport, and history. They stay permission-aware — controls appear only when the grant exists.",
  },
  {
    id: "appearance",
    label: "Appearance",
    blurb: "Theme and density.",
    body: "Appearance settings will expose theme and density. red-ui is dark-first; the topbar toggle and the ⌘K palette already switch themes.",
  },
];

/**
 * Resolve a section by id, falling back to the first section when the id is
 * unknown or null. The settings view drives the active section purely from
 * component state, so this never touches the URL.
 */
export function resolveSection(id: string | null): SettingsSection {
  return SETTINGS_SECTIONS.find((s) => s.id === id) ?? SETTINGS_SECTIONS[0];
}
