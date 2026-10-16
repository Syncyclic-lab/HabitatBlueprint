/**
 * Path surfaces: a polyline widened to a paved area. The surface is the union of one
 * rectangle per segment, a round join at every interior vertex and, for round caps, a circle
 * at each end. A path that ends where it started is a loop: it gets a join there instead of
 * two caps. Crossings and overlaps are counted once.
 *
 * End-cap circles are oriented along the path so exactly half of each lies beyond the end,
 * which keeps a straight path's area exact: L·w + π·(w/2)² with round caps, L·w with flat caps.
 */
import type { MultiPoly, Poly, Ring, Vec2 } from './types.ts';
import { add, angleDeg, cross, distance, dot, length, scale, sub } from './vec.ts';
import { normalizePoly } from './polygon.ts';
import { arcAreaFactor, catmullRom, ellipseRing, segmentsForRadius } from './flatten.ts';
import { unionAll } from './clip.ts';

export type CapStyle = 'round' | 'flat';

/** Turns smaller than this (radians) are treated as straight: no join needed. */
const STRAIGHT_RAD = 1e-9;

const circle = (c: Vec2, r: number, phaseDeg: number): Poly => ({
  outer: ellipseRing(c.x, c.y, r, r, 0, phaseDeg),
  holes: [],
});

function segmentQuad(a: Vec2, b: Vec2, r: number): Poly {
  const d = sub(b, a);
  const n = scale({ x: -d.y, y: d.x }, r / length(d));
  return normalizePoly({ outer: [add(a, n), add(b, n), sub(b, n), sub(a, n)], holes: [] });
}

/**
 * The round join at vertex `v` between segments prev→v and v→next.
 *
 * When both segments are at least r long, their rectangles already cover the whole circle
 * around `v` except the wedge on the outside of the turn, so only that wedge is needed. That
 * gives the same surface with far fewer edges for the union. Shorter segments get the full
 * circle. Straight-through vertices need nothing. The wedge's arc is area-preserving, like
 * every other curve we flatten.
 */
function joinPiece(prev: Vec2, v: Vec2, next: Vec2, r: number): Poly | null {
  const d1 = sub(v, prev);
  const d2 = sub(next, v);
  if (length(d1) < r || length(d2) < r) return circle(v, r, angleDeg(prev, v));
  const turn = Math.atan2(cross(d1, d2), dot(d1, d2));
  if (Math.abs(turn) < STRAIGHT_RAD) return null;
  // The uncovered wedge starts at the normal on the outside of the turn and sweeps by the turn.
  const start = Math.atan2(d1.y, d1.x) - (Math.sign(turn) * Math.PI) / 2;
  const m = Math.max(2, Math.ceil((segmentsForRadius(r) * Math.abs(turn)) / (2 * Math.PI)));
  const k = arcAreaFactor(m, Math.abs(turn) / m);
  const ring: Ring = [v];
  for (let s = 0; s <= m; s++) {
    const ang = start + (turn * s) / m;
    // The arc's ends meet the rectangles' corners; the points between move out so the area is exact.
    const rr = s === 0 || s === m ? r : r * k;
    ring.push({ x: v.x + rr * Math.cos(ang), y: v.y + rr * Math.sin(ang) });
  }
  return normalizePoly({ outer: ring, holes: [] });
}

/** The points a path actually follows (smoothed if asked, duplicates removed). */
export function pathPoints(points: readonly Vec2[], smooth: boolean): Vec2[] {
  const clean = points.filter((p, i) => i === 0 || distance(p, points[i - 1] as Vec2) > 1e-9);
  return smooth ? catmullRom(clean) : clean;
}

export function polylineLength(points: readonly Vec2[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += distance(points[i - 1] as Vec2, points[i] as Vec2);
  return sum;
}

/**
 * Unions the pieces of a path surface. polygon-clipping very occasionally fails on a long
 * chain of small pieces (a known sweep-line bug); merging neighbours in pairs, then pairs of
 * pairs, feeds it a different order of events and gets past it.
 */
function unionPieces(parts: MultiPoly[]): MultiPoly {
  try {
    return unionAll(parts);
  } catch {
    // unionAll only throws GeometryError; try the staged merge below.
  }
  let level = parts;
  while (level.length > 1) {
    const next: MultiPoly[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i] as MultiPoly;
      const b = level[i + 1];
      next.push(b ? unionAll([a, b]) : a);
    }
    level = next;
  }
  return level[0] as MultiPoly;
}

/** The paved surface of a path of the given width. */
export function bufferPolyline(
  points: readonly Vec2[],
  widthM: number,
  cap: CapStyle,
  smooth = false,
): MultiPoly {
  const pts = pathPoints(points, smooth);
  const r = widthM / 2;
  if (pts.length < 2 || r <= 0) return [];
  const parts: MultiPoly[] = [];
  for (let i = 1; i < pts.length; i++) {
    parts.push([segmentQuad(pts[i - 1] as Vec2, pts[i] as Vec2, r)]);
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const join = joinPiece(pts[i - 1] as Vec2, pts[i] as Vec2, pts[i + 1] as Vec2, r);
    if (join) parts.push([join]);
  }
  const first = pts[0] as Vec2;
  const last = pts[pts.length - 1] as Vec2;
  if (pts.length > 3 && distance(first, last) < 1e-6) {
    const join = joinPiece(pts[pts.length - 2] as Vec2, first, pts[1] as Vec2, r);
    if (join) parts.push([join]);
  } else if (cap === 'round') {
    parts.push([circle(first, r, angleDeg(first, pts[1] as Vec2))]);
    parts.push([circle(last, r, angleDeg(pts[pts.length - 2] as Vec2, last))]);
  }
  return unionPieces(parts);
}

/**
 * A last-resort path surface when the pieces can't be merged at all: the segment rectangles of
 * the unsmoothed points, not combined. It draws correctly; its area counts the small overlaps
 * at bends twice, so callers treat it as approximate.
 */
export function roughPathSurface(points: readonly Vec2[], widthM: number): MultiPoly {
  const pts = pathPoints(points, false);
  const r = widthM / 2;
  if (r <= 0) return [];
  const out: MultiPoly = [];
  for (let i = 1; i < pts.length; i++) out.push(segmentQuad(pts[i - 1] as Vec2, pts[i] as Vec2, r));
  return out;
}
