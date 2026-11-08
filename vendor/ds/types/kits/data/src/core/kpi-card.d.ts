export type KpiDeltaDirection = "increase" | "decrease" | "unchanged";
/** Which direction of change is good news for this metric. */
export type KpiPolarity = "higher-is-better" | "lower-is-better" | "neutral";
/** What a delta means, independent of its sign. */
export type KpiDeltaSentiment = "improvement" | "regression" | "neutral";
export declare function kpiDeltaDirection(delta: number): KpiDeltaDirection;
export declare function kpiDeltaSentiment(delta: number, polarity?: KpiPolarity): KpiDeltaSentiment;
export { DEPRECATED_KPI_CARD_TONES, KPI_CARD_TONES, type DeprecatedKpiCardTone, type KpiCardTone, } from "../kpi-card.variants";
export declare function formatKpiDelta(delta: number, suffix?: string): string;
