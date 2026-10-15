/**
 * Path surfaces: a polyline widened to a paved area. The surface is the union of one
 * rectangle per segment, a circle at every interior vertex (round joins) and, for round caps,
 * a circle at each end. Crossings and overlaps are counted once.
 *
 * End-cap circles are oriented along the path so exactly half of each lies beyond the end,
 * which keeps a straight path's area exact: L·w + π·(w/2)² with round caps, L·w with flat caps.
 */
import type { MultiPoly, Poly, Vec2 } from './types.ts';
import { add, angleDeg, distance, length, scale, sub } from './vec.ts';
import { normalizePoly } from './polygon.ts';
import { catmullRom, ellipseRing } from './flatten.ts';
import { unionAll } from './clip.ts';

export type CapStyle = 'round' | 'flat';

const circle = (c: Vec2, r: number, phaseDeg: number): Poly => ({
  outer: ellipseRing(c.x, c.y, r, r, 0, phaseDeg),
  holes: [],
});

function segmentQuad(a: Vec2, b: Vec2, r: number): Poly {
  const d = sub(b, a);
  const n = scale({ x: -d.y, y: d.x }, r / length(d));
  return normalizePoly({ outer: [add(a, n), add(b, n), sub(b, n), sub(a, n)], holes: [] });
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
    parts.push([circle(pts[i] as Vec2, r, angleDeg(pts[i - 1] as Vec2, pts[i] as Vec2))]);
  }
  if (cap === 'round') {
    const first = pts[0] as Vec2;
    const last = pts[pts.length - 1] as Vec2;
    parts.push([circle(first, r, angleDeg(first, pts[1] as Vec2))]);
    parts.push([circle(last, r, angleDeg(pts[pts.length - 2] as Vec2, last))]);
  }
  return unionAll(parts);
}
