/**
 * Turns curves into polygons for measuring and boolean operations.
 *
 * Circles and ellipses are flattened *area-preservingly*: the polygon's vertices sit slightly
 * outside the true curve and its edge midpoints slightly inside, so the polygon has exactly the
 * true area (π·rx·ry) while no point strays more than the chord tolerance from the curve.
 */
import { CHORD_TOLERANCE_M, EPS, type Poly, type Ring, type Shape, type Vec2 } from './types.ts';
import { add, distance, dot, length, rotateAround, scale, sub } from './vec.ts';
import { dedupeRing, normalizePoly } from './polygon.ts';

const MIN_SEGMENTS = 16;
const MAX_SEGMENTS = 1024;

/** Segments needed for a circle of radius r: a multiple of 4, so shapes stay symmetric. */
export function segmentsForRadius(r: number, tol = CHORD_TOLERANCE_M): number {
  const raw = r <= tol ? MIN_SEGMENTS : Math.ceil(Math.PI / Math.acos(1 - tol / r));
  const clamped = Math.min(MAX_SEGMENTS, Math.max(MIN_SEGMENTS, raw));
  return Math.ceil(clamped / 4) * 4;
}

/** Scale that makes a regular n-gon inscribed in a unit circle have area π. */
export const areaPreservingFactor = (n: number): number =>
  Math.sqrt((2 * Math.PI) / (n * Math.sin((2 * Math.PI) / n)));

/**
 * Ellipse (or circle) as a clockwise ring with the true area. `phaseDeg` turns the vertex
 * pattern so edges, not vertices, face along that direction (used for path end caps).
 */
export function ellipseRing(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg = 0,
  phaseDeg = 0,
): Ring {
  const n = segmentsForRadius(Math.max(rx, ry));
  const k = areaPreservingFactor(n);
  const phase = (phaseDeg * Math.PI) / 180;
  const centre = { x: cx, y: cy };
  const ring: Ring = [];
  for (let i = 0; i < n; i++) {
    const t = phase + (2 * Math.PI * (i + 0.5)) / n;
    const p = { x: cx + rx * k * Math.cos(t), y: cy + ry * k * Math.sin(t) };
    ring.push(rotationDeg === 0 ? p : rotateAround(p, centre, rotationDeg));
  }
  return ring;
}

/**
 * Replaces each corner with a circular arc of `radius` (shrunk where edges are too short).
 * Straight-through vertices are kept as they are.
 */
export function roundCorners(ring: Ring, radius: number, tol = CHORD_TOLERANCE_M): Ring {
  const pts = dedupeRing(ring);
  const n = pts.length;
  if (radius <= EPS || n < 3) return pts;
  const out: Ring = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n] as Vec2;
    const p1 = pts[i] as Vec2;
    const p2 = pts[(i + 1) % n] as Vec2;
    const e1 = sub(p0, p1);
    const e2 = sub(p2, p1);
    const l1 = length(e1);
    const l2 = length(e2);
    const d1 = scale(e1, 1 / l1);
    const d2 = scale(e2, 1 / l2);
    const cos = Math.max(-1, Math.min(1, dot(d1, d2)));
    const theta = Math.acos(cos);
    if (theta > Math.PI - 1e-6) {
      out.push(p1);
      continue;
    }
    const half = theta / 2;
    const t = Math.min(radius / Math.tan(half), l1 / 2, l2 / 2);
    const r = t * Math.tan(half);
    const a = add(p1, scale(d1, t));
    const b = add(p1, scale(d2, t));
    const bis = add(d1, d2);
    const centre = add(p1, scale(bis, r / Math.sin(half) / length(bis)));
    const angA = Math.atan2(a.y - centre.y, a.x - centre.x);
    const angB = Math.atan2(b.y - centre.y, b.x - centre.x);
    let delta = angB - angA;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    const step = r > tol ? 2 * Math.acos(1 - tol / r) : Math.PI;
    const segs = Math.max(2, Math.ceil(Math.abs(delta) / step));
    const k = arcAreaFactor(segs, Math.abs(delta) / segs);
    for (let s = 0; s <= segs; s++) {
      const ang = angA + (delta * s) / segs;
      // Tangent points stay on the edges; the points between move out so the area is exact.
      const rr = s === 0 || s === segs ? r : r * k;
      out.push({ x: centre.x + rr * Math.cos(ang), y: centre.y + rr * Math.sin(ang) });
    }
  }
  return dedupeRing(out);
}

/**
 * Radius factor for an arc's interior points so the fan of `m` triangles (m ≥ 2, each spanning
 * `theta` radians) has exactly the area of the true circular sector. Solves
 * (m − 2)·k² + 2k = m·θ / sin θ.
 */
export function arcAreaFactor(m: number, theta: number): number {
  const target = (m * theta) / Math.sin(theta);
  if (m === 2) return target / 2;
  return (-1 + Math.sqrt(1 + (m - 2) * target)) / (m - 2);
}

/** The four corners of a rectangle (rounded and rotated as stored), clockwise. */
export function rectRing(
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg = 0,
  cornerRadiusM = 0,
): Ring {
  const corners: Ring = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  const ring = roundCorners(corners, cornerRadiusM);
  if (rotationDeg === 0) return ring;
  const centre = { x: x + w / 2, y: y + h / 2 };
  return ring.map((p) => rotateAround(p, centre, rotationDeg));
}

/** Any stored shape as a normalised polygon (outer clockwise, holes counter-clockwise). */
export function shapeToPoly(shape: Shape): Poly {
  switch (shape.kind) {
    case 'polygon':
      return normalizePoly({
        outer: roundCorners(shape.points, shape.cornerRadiusM ?? 0),
        holes: shape.holes ?? [],
      });
    case 'rect':
      return normalizePoly({
        outer: rectRing(shape.x, shape.y, shape.w, shape.h, shape.rotationDeg, shape.cornerRadiusM),
        holes: [],
      });
    case 'ellipse':
      return {
        outer: ellipseRing(shape.cx, shape.cy, shape.rx, shape.ry, shape.rotationDeg),
        holes: [],
      };
  }
}

/**
 * Uniform Catmull–Rom curve through the points, flattened to short straight pieces
 * (about every 0.5 m, at least 2 and at most 64 per span). Used for smoothed paths.
 */
export function catmullRom(points: readonly Vec2[]): Vec2[] {
  const n = points.length;
  if (n < 3) return [...points];
  const out: Vec2[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)] as Vec2;
    const p1 = points[i] as Vec2;
    const p2 = points[i + 1] as Vec2;
    const p3 = points[Math.min(n - 1, i + 2)] as Vec2;
    const steps = Math.min(64, Math.max(2, Math.ceil(distance(p1, p2) / 0.5)));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[n - 1] as Vec2);
  return out;
}
