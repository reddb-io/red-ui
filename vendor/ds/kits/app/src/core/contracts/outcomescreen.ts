import type { StateIllustrationAsset } from "@reddb-io/design-system/base/illustrations";
/** A terminal result surface independent of any authorization or product flow. */
export interface OutcomeScreenContract {
  /** Successful completion or a failure requiring explanation or recovery. */
  outcome: "success" | "error";
  /** The outcome in plain language; rendered as a heading. */
  title: string;
  /** What happened and, when appropriate, what to do next. */
  description?: string;
  /** Fill the viewport for a standalone result screen. Defaults to true. */
  fullPage?: boolean;
  /** Optional extra guidance, such as whether the window can be closed. */
  note?: string;
  /** Outline depth of the title. Defaults to 1 for a standalone screen. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Override the default operation artwork with a context-specific DS illustration. */
  illustration?: StateIllustrationAsset;
}
