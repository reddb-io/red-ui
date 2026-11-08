export { formatStatsMetric, statsGaugePercent } from "./stats-explorer";
export type { StatsMetric } from "./stats-explorer";
import type { StatsExplorerContract } from "./core/contracts/statsexplorer";
interface Props extends StatsExplorerContract {
    /** Extra root classes. */
    class?: string;
}
declare const StatsExplorer: import("svelte").Component<Props, {}, "">;
type StatsExplorer = ReturnType<typeof StatsExplorer>;
export default StatsExplorer;
