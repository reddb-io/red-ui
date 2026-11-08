/** Reading supplied to a custom radial center. */
export interface RadialReading {
    /** Current clamped measurement. */
    value: number;
    /** Normalized progress between zero and one hundred. */
    percent: number;
    /** False for unknown-duration work. */
    determinate: boolean;
}
/** Ring width as a fraction of its outer radius. */
export declare function ringThickness(value: number): number;
