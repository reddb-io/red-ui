import type { EventSeriesExplorerContract } from "./core/contracts/eventseriesexplorer";
interface Props extends EventSeriesExplorerContract {
    /** Extra root classes. */
    class?: string;
}
declare const EventSeriesExplorer: import("svelte").Component<Props, {}, "">;
type EventSeriesExplorer = ReturnType<typeof EventSeriesExplorer>;
export default EventSeriesExplorer;
