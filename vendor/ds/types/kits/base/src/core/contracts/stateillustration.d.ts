import type { StateIllustrationAsset } from "../state-illustration";
import type { ColorToken } from "../color-token";
import type { StateIllustrationSize } from "../../state-illustration.variants";
/** Passive state artwork, independently composed with the page's copy and actions. */
export interface StateIllustrationContract {
    /** Named artwork imported individually from base/illustrations, for example searchEmpty. */
    art: StateIllustrationAsset;
    /** Density-responsive bounds; full fits its parent. Defaults to md. */
    size?: StateIllustrationSize;
    /** Optional CSS colour token for the accent; omitted, uses the primary role. */
    accent?: ColorToken;
    /** Hide artwork from assistive technology when nearby text carries its meaning. Defaults to true. */
    decorative?: boolean;
    /** Accessible description required when decorative is false; never drawn inside the SVG. */
    label?: string;
}
