export * from "./core/kpi-card";
import type { KpiCardContract } from "./core/contracts/kpicard";
import type { Snippet } from "svelte";
interface Props extends KpiCardContract {
    /** Optional chart content, normally a Sparkline imported by the caller. */
    sparkline?: Snippet;
    /** Extra classes, merged over the root slot's own, onto the card's root `section`. */
    class?: string;
}
declare const KpiCard: import("svelte").Component<Props, {}, "">;
type KpiCard = ReturnType<typeof KpiCard>;
export default KpiCard;
