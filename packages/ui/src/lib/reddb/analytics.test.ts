import { describe, it, expect } from "vitest";
import {
  chartKindForMetric,
  parsePromMatrix,
  parsePromVector,
  promQLForMetric,
  type PromResponse,
} from "./analytics";

describe("chartKindForMetric", () => {
  it("maps each metric kind to its honest chart", () => {
    expect(chartKindForMetric("counter")).toBe("line");
    expect(chartKindForMetric("gauge")).toBe("area");
    expect(chartKindForMetric("histogram")).toBe("percentiles");
    expect(chartKindForMetric("ratio")).toBe("gauge");
    expect(chartKindForMetric("derived")).toBe("line");
  });
});

describe("promQLForMetric", () => {
  it("rates a counter over the window", () => {
    const plan = promQLForMetric({ path: "http.requests", kind: "counter" });
    expect(plan.chart).toBe("line");
    expect(plan.queries).toEqual([
      { label: "http.requests", expr: "rate(http.requests[5m])" },
    ]);
  });

  it("expands a histogram into p50/p95/p99 quantile queries", () => {
    const plan = promQLForMetric(
      { path: "http.latency", kind: "histogram" },
      { window: "1m" }
    );
    expect(plan.chart).toBe("percentiles");
    expect(plan.queries.map((q) => q.label)).toEqual(["p50", "p95", "p99"]);
    expect(plan.queries[1].expr).toBe(
      "histogram_quantile(0.95, sum by (le) (rate(http.latency_bucket[1m])))"
    );
  });

  it("reads a gauge/ratio level directly", () => {
    expect(
      promQLForMetric({ path: "queue.depth", kind: "gauge" }).queries[0].expr
    ).toBe("queue.depth");
    expect(
      promQLForMetric({ path: "cache.hit_rate", kind: "ratio" }).queries[0]
    ).toEqual({
      label: "cache.hit_rate",
      expr: "cache.hit_rate",
    });
  });
});

describe("parsePromMatrix", () => {
  it("normalises matrix series into ms-timestamped points", () => {
    const resp: PromResponse = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: { __name__: "cpu", host: "a" },
            values: [
              [1700000000, "0.5"],
              [1700000060, "0.7"],
            ],
          },
        ],
      },
    };
    const series = parsePromMatrix(resp);
    expect(series).toHaveLength(1);
    expect(series[0].label).toBe("cpu{host=a}");
    expect(series[0].points).toEqual([
      { t: 1700000000000, v: 0.5 },
      { t: 1700000060000, v: 0.7 },
    ]);
  });

  it("drops NaN gap samples", () => {
    const resp: PromResponse = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: { __name__: "x" },
            values: [
              [1, "NaN"],
              [2, "3"],
            ],
          },
        ],
      },
    };
    expect(parsePromMatrix(resp)[0].points).toEqual([{ t: 2000, v: 3 }]);
  });

  it("returns nothing for an error envelope", () => {
    expect(
      parsePromMatrix({ status: "error", errorType: "bad_data", error: "x" })
    ).toEqual([]);
  });
});

describe("parsePromVector", () => {
  it("normalises an instant vector into one point per series", () => {
    const resp: PromResponse = {
      status: "success",
      data: {
        resultType: "vector",
        result: [
          { metric: { __name__: "up", job: "db" }, value: [1700000000, "1"] },
        ],
      },
    };
    const series = parsePromVector(resp);
    expect(series[0].label).toBe("up{job=db}");
    expect(series[0].points).toEqual([{ t: 1700000000000, v: 1 }]);
  });
});
