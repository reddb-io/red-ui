import type { ChartSeries } from "../../chart";
import type { CandlePoint, CompositeValueSeries } from "../composite-chart";
import type { CompositeChartContract } from "./compositechart";
/** OHLC specialization of the shared mixed-chart contract. */
export interface CandlestickContract extends Omit<CompositeChartContract, "data" | "orientation"> {
  /** Caller-owned OHLC observations, using the same coordinate type as every overlay. */
  data: readonly CandlePoint[];
  /** Optional line, area or column layers, in drawing order above the `candles` layer. The id `candles` is reserved. */
  overlays?: readonly CompositeValueSeries[];
  /** Visible name of the candle series in the compact legend and OHLC readout. */
  candleLabel?: string;
  /** DS categorical Series Role for the candle layer. Direction is also encoded by hollow/filled/cross geometry. */
  series?: ChartSeries;
}
