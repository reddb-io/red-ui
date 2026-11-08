import type { SkeletonShape } from "../../skeleton.variants";
/** Shared loading geometry; neither native adapter fetches data or starts timers. */
export interface SkeletonContract {
    /** Basic geometry or a content silhouette. Defaults to text. */
    shape?: SkeletonShape;
    /** Optional name when this skeleton owns the loading announcement. Leave children decorative when a parent owns aria-busy. */
    label?: string;
    /** Placeholder rows in table, list and heatmap shapes. Integer from 1 to 20; defaults to 5. */
    rows?: number;
    /** Placeholder columns in table and heatmap shapes. Integer from 1 to 12; defaults to 4. */
    columns?: number;
    /** Enable the opacity pulse. Defaults to true; reduced-motion preferences always stop animation. */
    animated?: boolean;
}
