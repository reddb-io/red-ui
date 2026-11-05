import type { DeveloperRequest } from "../../developer-panel";
/** Portable developer panel properties. The application owns the source and sanitization of all data. */
export interface DeveloperPanelContract {
  /** Accessible name for the panel. */
  label: string;
  /** Sanitized request snapshot in chronological order. */
  requests: readonly DeveloperRequest[];
  /** Whether the bottom panel is expanded. */
  open?: boolean;
  /** Whether the panel is positioned within its host instead of the viewport. */
  contained?: boolean;
}
