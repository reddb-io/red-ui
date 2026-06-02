// Force-directed edge bundling (FDEB) for the graph renderer.
//
// Pure, DOM-free, and deterministic — no sigma/WebGL imports — so it stays
// unit-testable in the node environment alongside graph-render/graph-sigma.
// The algorithm is the Holten & van Wijk force-directed scheme (the same one
// d3.ForceBundle popularised): each edge is subdivided into points that are
// pulled toward the corresponding points of *compatible* edges, so edges that
// run roughly parallel collapse onto shared trunks and the "hairball" of a
// dense subgraph untangles into legible bundles.
//
// It is meant to be **precomputed** (memoised by the caller, recomputed only
// when the draw set or layout changes) — never run per animation frame. The
// caller caps edge count via BUNDLE_EDGE_LIMIT because the compatibility step
// is O(E²).

export interface BundlePoint {
  x: number;
  y: number;
}

export interface BundleNodePosition {
  id: string;
  x: number;
  y: number;
}

export interface BundleEdgeInput {
  id: string;
  source: string;
  target: string;
}

export interface BundleOptions {
  /** Global bundling stiffness (spring constant K). */
  stiffness: number;
  /** Initial displacement step size, halved every cycle. */
  stepSize: number;
  /** Number of cycles (each doubles the subdivision count). */
  cycles: number;
  /** Iterations in the first cycle, decayed by iterationRate each cycle. */
  iterations: number;
  /** Multiplicative decay applied to the iteration count per cycle. */
  iterationRate: number;
  /** Factor the subdivision-point count grows by each cycle. */
  subdivisionRate: number;
  /** Edges with a combined compatibility below this don't attract. */
  compatibilityThreshold: number;
}

export const DEFAULT_BUNDLE_OPTIONS: BundleOptions = {
  stiffness: 0.1,
  stepSize: 0.1,
  cycles: 6,
  iterations: 60,
  iterationRate: 2 / 3,
  subdivisionRate: 2,
  compatibilityThreshold: 0.6,
};

// Above this many edges in the draw set, the O(E²) compatibility pass gets too
// costly to run synchronously; the renderer skips bundling and says so.
export const BUNDLE_EDGE_LIMIT = 1500;

const EPS = 1e-6;

interface Segment {
  id: string;
  s: BundlePoint;
  t: BundlePoint;
  len: number;
}

function distance(a: BundlePoint, b: BundlePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(s: BundlePoint, t: BundlePoint): BundlePoint {
  return { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
}

/**
 * Resample a polyline to exactly `interior + 2` points evenly spaced by arc
 * length (endpoints preserved). FDEB redistributes subdivision points this way
 * at the start of every cycle so the spring forces stay balanced.
 */
function resample(points: BundlePoint[], interior: number): BundlePoint[] {
  const count = interior + 2;
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + distance(points[i], points[i - 1]));
  }
  const total = cum[cum.length - 1];
  if (total < EPS) {
    return Array.from({ length: count }, () => ({ ...points[0] }));
  }
  const out: BundlePoint[] = [];
  let seg = 1;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    while (seg < points.length - 1 && cum[seg] < target) seg++;
    const t0 = cum[seg - 1];
    const span = cum[seg] - t0 || 1;
    const pct = Math.max(0, Math.min(1, (target - t0) / span));
    out.push({
      x: points[seg - 1].x + pct * (points[seg].x - points[seg - 1].x),
      y: points[seg - 1].y + pct * (points[seg].y - points[seg - 1].y),
    });
  }
  return out;
}

// ─── pairwise edge compatibility (angle · scale · position · visibility) ─────

function angleCompatibility(p: Segment, q: Segment): number {
  const dot =
    (p.t.x - p.s.x) * (q.t.x - q.s.x) + (p.t.y - p.s.y) * (q.t.y - q.s.y);
  return Math.abs(dot / (p.len * q.len));
}

function scaleCompatibility(p: Segment, q: Segment): number {
  const lavg = (p.len + q.len) / 2;
  return 2 / (lavg / Math.min(p.len, q.len) + Math.max(p.len, q.len) / lavg);
}

function positionCompatibility(p: Segment, q: Segment): number {
  const lavg = (p.len + q.len) / 2;
  return lavg / (lavg + distance(midpoint(p.s, p.t), midpoint(q.s, q.t)));
}

function projectOntoLine(point: BundlePoint, line: Segment): BundlePoint {
  const l2 = line.len * line.len;
  const r =
    ((line.s.y - point.y) * (line.s.y - line.t.y) -
      (line.s.x - point.x) * (line.t.x - line.s.x)) /
    l2;
  return {
    x: line.s.x + r * (line.t.x - line.s.x),
    y: line.s.y + r * (line.t.y - line.s.y),
  };
}

function edgeVisibility(p: Segment, q: Segment): number {
  const i0 = projectOntoLine(q.s, p);
  const i1 = projectOntoLine(q.t, p);
  const im = midpoint(i0, i1);
  const denom = distance(i0, i1);
  if (denom < EPS) return 0;
  return Math.max(0, 1 - (2 * distance(im, midpoint(q.s, q.t))) / denom);
}

function visibilityCompatibility(p: Segment, q: Segment): number {
  return Math.min(edgeVisibility(p, q), edgeVisibility(q, p));
}

function compatibilityScore(p: Segment, q: Segment): number {
  return (
    angleCompatibility(p, q) *
    scaleCompatibility(p, q) *
    positionCompatibility(p, q) *
    visibilityCompatibility(p, q)
  );
}

function compatibilityLists(
  segments: Segment[],
  threshold: number
): number[][] {
  const lists: number[][] = segments.map(() => []);
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (compatibilityScore(segments[i], segments[j]) >= threshold) {
        lists[i].push(j);
        lists[j].push(i);
      }
    }
  }
  return lists;
}

/**
 * Run force-directed edge bundling. Returns a polyline (source → … → target,
 * endpoints included) for every input edge whose endpoints resolve. Edges that
 * are dropped, self-loops, or zero-length get a straight two-point polyline so
 * the caller always has geometry to draw.
 */
export function bundleEdges(
  nodes: BundleNodePosition[],
  edges: BundleEdgeInput[],
  options: Partial<BundleOptions> = {}
): Map<string, BundlePoint[]> {
  const opts = { ...DEFAULT_BUNDLE_OPTIONS, ...options };
  const pos = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  const result = new Map<string, BundlePoint[]>();

  const segments: Segment[] = [];
  for (const e of edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    // Straight fallback for every resolvable edge; bundleable ones overwrite it.
    result.set(e.id, [{ ...s }, { ...t }]);
    if (e.source === e.target) continue;
    const len = distance(s, t);
    if (len < EPS) continue;
    segments.push({ id: e.id, s: { ...s }, t: { ...t }, len });
  }

  if (segments.length < 2) return result;

  const subdivisions: BundlePoint[][] = segments.map((seg) => [
    { ...seg.s },
    { ...seg.t },
  ]);
  const compat = compatibilityLists(segments, opts.compatibilityThreshold);

  let p = 1;
  let step = opts.stepSize;
  let iterations = opts.iterations;

  for (let i = 0; i < subdivisions.length; i++) {
    subdivisions[i] = resample(subdivisions[i], p);
  }

  for (let cycle = 0; cycle < opts.cycles; cycle++) {
    const rounds = Math.max(1, Math.round(iterations));
    for (let iter = 0; iter < rounds; iter++) {
      const forces = segments.map((_, ei) =>
        computeForces(
          ei,
          subdivisions,
          compat,
          segments[ei].len,
          p,
          step,
          opts.stiffness
        )
      );
      for (let ei = 0; ei < segments.length; ei++) {
        for (let i = 1; i <= p; i++) {
          subdivisions[ei][i].x += forces[ei][i].x;
          subdivisions[ei][i].y += forces[ei][i].y;
        }
      }
    }
    step *= 0.5;
    p *= opts.subdivisionRate;
    iterations *= opts.iterationRate;
    for (let i = 0; i < subdivisions.length; i++) {
      subdivisions[i] = resample(subdivisions[i], p);
    }
  }

  for (let ei = 0; ei < segments.length; ei++) {
    result.set(
      segments[ei].id,
      subdivisions[ei].map((pt) => ({ x: pt.x, y: pt.y }))
    );
  }
  return result;
}

function computeForces(
  ei: number,
  subdivisions: BundlePoint[][],
  compat: number[][],
  edgeLen: number,
  p: number,
  step: number,
  stiffness: number
): BundlePoint[] {
  const kp = stiffness / (edgeLen * (p + 1));
  const points = subdivisions[ei];
  const forces: BundlePoint[] = [{ x: 0, y: 0 }];
  for (let i = 1; i <= p; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    // Spring force keeps the subdivision points evenly distributed.
    let fx = kp * (prev.x - 2 * cur.x + next.x);
    let fy = kp * (prev.y - 2 * cur.y + next.y);
    // Electrostatic force pulls toward the matching point of compatible edges.
    for (const oe of compat[ei]) {
      const other = subdivisions[oe][i];
      const dx = other.x - cur.x;
      const dy = other.y - cur.y;
      if (Math.abs(dx) > EPS || Math.abs(dy) > EPS) {
        const d = Math.hypot(dx, dy);
        fx += dx / d;
        fy += dy / d;
      }
    }
    forces.push({ x: step * fx, y: step * fy });
  }
  forces.push({ x: 0, y: 0 });
  return forces;
}

/**
 * Map a bundled polyline onto a single sigma `curvature` value: the signed
 * perpendicular deviation of its most-displaced point, scaled so a quadratic
 * Bézier reproduces that bow (mid-curve deviation = ½·curvature·length).
 *
 * Sigma's WebGL scene flips y relative to layout space, so the caller negates
 * this when feeding @sigma/edge-curve. Returns 0 for straight / degenerate
 * polylines.
 */
export function edgeCurvature(points: BundlePoint[]): number {
  if (points.length < 3) return 0;
  const s = points[0];
  const t = points[points.length - 1];
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const len = Math.hypot(dx, dy);
  if (len < EPS) return 0;
  // Signed distance to the source→target line along the left normal (-dy, dx).
  let maxDev = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const px = points[i].x - s.x;
    const py = points[i].y - s.y;
    const dev = (px * -dy + py * dx) / len;
    if (Math.abs(dev) > Math.abs(maxDev)) maxDev = dev;
  }
  const curvature = (2 * maxDev) / len;
  return Math.max(-1, Math.min(1, curvature));
}

// ─── crossing metric (validates "measurable drop in crossings") ──────────────

function cross(a: BundlePoint, b: BundlePoint, c: BundlePoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsCross(
  p1: BundlePoint,
  p2: BundlePoint,
  p3: BundlePoint,
  p4: BundlePoint
): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  // Strict signs ⇒ proper crossings only; segments that merely touch at a
  // shared node endpoint (a d of 0) are not counted.
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/**
 * Count proper crossings between distinct polylines (straight edges are
 * two-point polylines). A correctness primitive for the geometry; note that
 * FDEB does *not* aim to reduce topological crossings (two edges with
 * interleaved endpoints must cross however they are routed) — use `edgeInk`
 * to measure the clutter reduction bundling actually delivers.
 */
export function countEdgeCrossings(polylines: BundlePoint[][]): number {
  let crossings = 0;
  for (let a = 0; a < polylines.length; a++) {
    const A = polylines[a];
    for (let b = a + 1; b < polylines.length; b++) {
      const B = polylines[b];
      for (let i = 1; i < A.length; i++) {
        for (let j = 1; j < B.length; j++) {
          if (segmentsCross(A[i - 1], A[i], B[j - 1], B[j])) crossings++;
        }
      }
    }
  }
  return crossings;
}

/**
 * "Edge ink": the number of distinct grid cells the edge polylines paint, at a
 * given cell size. This is the standard quality measure for edge bundling —
 * the visual signal behind "untangle the hairball". Bundling routes compatible
 * edges onto shared trunks, so their strokes overlap and the painted area (and
 * thus the visible crossing clutter) drops measurably. Lower is tighter.
 */
export function edgeInk(polylines: BundlePoint[][], cellSize: number): number {
  const cells = new Set<string>();
  const half = cellSize / 2;
  for (const poly of polylines) {
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1];
      const b = poly[i];
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / half)
      );
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const x = Math.floor((a.x + u * (b.x - a.x)) / cellSize);
        const y = Math.floor((a.y + u * (b.y - a.y)) / cellSize);
        cells.add(`${x},${y}`);
      }
    }
  }
  return cells.size;
}
