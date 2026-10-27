/** Noninteractive identity and reading placed in a radial center. */
export interface RadialContentContract {
  /** Short title; full text remains available as a native title. */
  title?: string;
  /** Current formatted reading. */
  value: string | number;
  /** Optional supporting measurement or unit. */
  description?: string;
  /** Image and textual fallback for the represented entity. */
  avatar?: { src?: string; name: string; fallback: string };
}
