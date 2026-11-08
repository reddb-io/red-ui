interface Props {
    /** Inclusive first calendar day. */
    start: Date;
    /** Exclusive end of the calendar range. */
    end: Date;
    /** The intensity step (0–4) of the local day a cell date falls on. */
    stepOf: (date: Date) => number;
    /** Drawing width in px. */
    width: number;
    /** Drawing height in px. */
    height: number;
}
declare const HeatmapChart: import("svelte").Component<Props, {}, "">;
type HeatmapChart = ReturnType<typeof HeatmapChart>;
export default HeatmapChart;
