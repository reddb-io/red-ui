import { describe, it, expect } from "vitest";
import {
  isUnavailable,
  measured,
  reasonOf,
  topologyOf,
  bootDurationMs,
  maxReplicaLagSeconds,
  unavailableFields,
  type ClusterStatus,
  type ReplicationStatus,
} from "./cluster-status";

const unavailable = (reason: string) => ({ available: false as const, reason });

describe("measurable helpers", () => {
  it("recognises the unavailable envelope", () => {
    expect(isUnavailable(unavailable("x"))).toBe(true);
    expect(isUnavailable(42)).toBe(false);
    expect(isUnavailable(null)).toBe(false);
    expect(isUnavailable({ available: true })).toBe(false);
  });

  it("unwraps measured values and drops unavailable ones", () => {
    expect(measured(4096)).toBe(4096);
    expect(measured(0)).toBe(0);
    expect(measured(unavailable("nope"))).toBeUndefined();
    expect(measured(undefined)).toBeUndefined();
  });

  it("exposes the reason only for unavailable fields", () => {
    expect(reasonOf(unavailable("cpu_usage_not_sampled"))).toBe(
      "cpu_usage_not_sampled"
    );
    expect(reasonOf(99)).toBeUndefined();
  });
});

describe("topologyOf", () => {
  it("classifies a replication relationship by role, over shape", () => {
    const cluster: ClusterStatus = {
      deployment: { shape: "server", process_role: "primary" },
    };
    expect(topologyOf(cluster)).toBe("replicated");
  });

  it("classifies serverless by shape", () => {
    expect(
      topologyOf({
        deployment: { shape: "serverless", process_role: "standalone" },
      })
    ).toBe("serverless");
  });

  it("treats embedded and file shapes as the embedded topology", () => {
    expect(topologyOf({ deployment: { shape: "embedded" } })).toBe("embedded");
    expect(topologyOf({ deployment: { shape: "file" } })).toBe("embedded");
  });

  it("classifies a plain networked node as server", () => {
    expect(
      topologyOf({
        deployment: { shape: "server", process_role: "standalone" },
      })
    ).toBe("server");
  });

  it("falls back to replication role when shape is unavailable", () => {
    const cluster: ClusterStatus = {
      deployment: { shape: unavailable("deployment_shape_unknown") },
    };
    const repl: ReplicationStatus = { ok: true, role: "replica" };
    expect(topologyOf(cluster, repl)).toBe("replicated");
  });

  it("falls back to the preset role when the server exposes nothing", () => {
    expect(topologyOf(undefined, undefined, "replica")).toBe("replicated");
    expect(topologyOf(undefined, undefined, "embedded")).toBe("embedded");
    expect(topologyOf(undefined, undefined)).toBe("unknown");
  });
});

describe("bootDurationMs", () => {
  it("computes ready − started for a serverless cold start", () => {
    expect(
      bootDurationMs({ started_at_unix_ms: 1000, ready_at_unix_ms: 1850 })
    ).toBe(850);
  });

  it("returns null when not yet ready", () => {
    expect(bootDurationMs({ started_at_unix_ms: 1000 })).toBeNull();
    expect(bootDurationMs({})).toBeNull();
  });
});

describe("maxReplicaLagSeconds", () => {
  it("returns the worst wall-clock lag across replicas", () => {
    const repl: ReplicationStatus = {
      ok: true,
      role: "primary",
      replicas: [
        {
          id: "a",
          last_acked_lsn: 5,
          last_sent_lsn: 5,
          lag_lsn: 0,
          lag_seconds: 0.2,
          rebootstrapping: false,
        },
        {
          id: "b",
          last_acked_lsn: 2,
          last_sent_lsn: 5,
          lag_lsn: 3,
          lag_seconds: 4.7,
          rebootstrapping: false,
        },
      ],
    };
    expect(maxReplicaLagSeconds(repl)).toBeCloseTo(4.7);
  });

  it("returns null with no replicas", () => {
    expect(
      maxReplicaLagSeconds({ ok: true, role: "primary", replicas: [] })
    ).toBeNull();
    expect(maxReplicaLagSeconds({ ok: true, role: "standalone" })).toBeNull();
  });
});

describe("unavailableFields", () => {
  it("collects every field the server declined to measure, with reasons", () => {
    const cluster: ClusterStatus = {
      storage: { db_size_bytes: 4096 },
      system: {
        pid: 1,
        cpu_cores: 8,
        os: "linux",
        arch: "x86_64",
        hostname: "h",
        total_memory_bytes: 16,
        available_memory_bytes: 8,
        cpu_usage: unavailable("cpu_usage_not_sampled"),
        ram_usage: unavailable("ram_usage_not_sampled"),
      },
      throughput: unavailable("throughput_not_sampled"),
      latency: unavailable("latency_not_sampled"),
      last_error: unavailable("last_error_not_tracked"),
    };
    const paths = unavailableFields(cluster)
      .map((f) => f.path)
      .sort();
    expect(paths).toEqual([
      "last_error",
      "latency",
      "system.cpu_usage",
      "system.ram_usage",
      "throughput",
    ]);
    const cpu = unavailableFields(cluster).find(
      (f) => f.path === "system.cpu_usage"
    );
    expect(cpu?.reason).toBe("cpu_usage_not_sampled");
  });

  it("returns nothing for a fully-measured payload", () => {
    expect(unavailableFields({ storage: { db_size_bytes: 1 } })).toEqual([]);
    expect(unavailableFields(undefined)).toEqual([]);
  });
});
