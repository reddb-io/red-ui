// Static settings sections for the minimal settings view. Kept framework-free
// (no Svelte imports) so the section list and the active-section resolver are
// trivially unit-testable. Icons are mapped in `SettingsView.svelte`, not here.

/** A single settings row, rendered through the ui-kit `ListRow` primitive. */
export interface SettingsRow {
  /** Row label. */
  title: string;
  /** Secondary line under the title. */
  description?: string;
  /** Mono value/hint shown beside the title (a key, an id, the active value). */
  hint?: string;
  /** Status tone for the trailing pill — omit for no pill. */
  status?: { label: string; tone: "muted" | "accent" };
  /** Stack the action beneath the label (the ui-kit `ListRow` `wide` variant). */
  wide?: boolean;
}

export interface SettingsSection {
  /** Stable identifier used as the active-section key (component state only). */
  id: string;
  /** Nav label. */
  label: string;
  /** One-line description shown under the section title. */
  blurb: string;
  /** Static body copy — proof of an end-to-end mount, not live data. */
  body: string;
  /** Static rows rendered with the ui-kit settings primitives. */
  rows: SettingsRow[];
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "general",
    label: "General",
    blurb: "Workspace defaults for this red-ui instance.",
    body: "General preferences live here. This minimal section proves the two-pane shell mounts end-to-end; richer controls land in follow-up issues.",
    rows: [
      {
        title: "Default landing surface",
        description: "Where ⌘K-less navigation drops you on launch.",
        hint: "topology",
        status: { label: "Default", tone: "muted" },
      },
      {
        title: "Confirm destructive actions",
        description: "Show a diff before drops, truncates, and bulk deletes.",
        status: { label: "On", tone: "accent" },
      },
      {
        title: "Telemetry",
        description: "Anonymous usage signals. Off until you opt in.",
        status: { label: "Off", tone: "muted" },
      },
    ],
  },
  {
    id: "connection",
    label: "Connection",
    blurb: "How red-ui reaches your reddb cluster.",
    body: "Connection settings will surface the active target, transport, and history. They stay permission-aware — controls appear only when the grant exists.",
    rows: [
      {
        title: "Active target",
        description: "The cluster red-ui is bound to this session.",
        hint: "red://localhost:5050",
        status: { label: "Live", tone: "accent" },
      },
      {
        title: "Transport",
        description: "Negotiated wire protocol for the active target.",
        hint: "RedWire",
      },
      {
        title: "Connection string",
        description: "Edit the target URI. Reconnects on save.",
        hint: "red://",
        wide: true,
      },
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    blurb: "Theme and density.",
    body: "Appearance settings will expose theme and density. red-ui is dark-first; the topbar toggle and the ⌘K palette already switch themes.",
    rows: [
      {
        title: "Theme",
        description: "red-ui is dark-first. Light mode is not shipped yet.",
        hint: "dark",
        status: { label: "Locked", tone: "muted" },
      },
      {
        title: "Density",
        description: "Compact rows and mono numbers — power-user default.",
        hint: "compact",
        status: { label: "Default", tone: "muted" },
      },
    ],
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
