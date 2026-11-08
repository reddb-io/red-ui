interface Props {
    /** The binned counts. */
    data: readonly {
        x0: number;
        x1: number;
        label: string;
        count: number;
    }[];
    /** Drawing width in px. */
    width: number;
    /** Drawing height in px. */
    height: number;
    /** Plot padding in px. */
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    /** Space between bars, as a fraction of each bin. */
    bandPadding: number;
    /** Whole-number count ticks for the value axis and grid. */
    countTicks: (scale: {
        ticks?: (count?: number) => unknown[];
    }) => number[];
    /** How many bin labels fit across the plot. */
    binTicks: number;
}
declare const HistogramChart: import("svelte").Component<Props, {}, "">;
type HistogramChart = ReturnType<typeof HistogramChart>;
export default HistogramChart;
