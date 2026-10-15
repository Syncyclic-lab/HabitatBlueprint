/** Segment intersection and simple-polygon (no self-intersection) checks. */
import { EPS, type Ring, type Vec2 } from './types.ts';
import { cross, dot, sub } from './vec.ts';
import { dedupeRing, ringArea } from './polygon.ts';

const orient = (a: Vec2, b: Vec2, c: Vec2): number => {
  const v = cross(sub(b, a), sub(c, a));
  return Math.abs(v) < 1e-9 ? 0 : Math.sign(v);
};

/** For collinear a, b, p: is p within the segment ab's extent? */
const within = (a: Vec2, b: Vec2, p: Vec2): boolean =>
  p.x >= Math.min(a.x, b.x) - EPS &&
  p.x <= Math.max(a.x, b.x) + EPS &&
  p.y >= Math.min(a.y, b.y) - EPS &&
  p.y <= Math.max(a.y, b.y) + EPS;

/** True if segments ab and cd touch or cross, including collinear overlap. */
export function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && within(a, b, c)) ||
    (o2 === 0 && within(a, b, d)) ||
    (o3 === 0 && within(c, d, a)) ||
    (o4 === 0 && within(c, d, b))
  );
}

/**
 * Finds the first pair of edges that cross in a closed ring. Edge i runs from point i to
 * point i+1. Adjacent edges only count if they fold back over each other.
 */
export function findSelfIntersection(ring: Ring): [number, number] | null {
  const n = ring.length;
  if (n < 3) return null;
  const pt = (i: number) => ring[i % n] as Vec2;
  for (let i = 0; i < n; i++) {
    // Adjacent edge i+1 folds back if it is collinear with edge i and points backwards.
    const a = pt(i);
    const b = pt(i + 1);
    const c = pt(i + 2);
    if (n > 3 && orient(a, b, c) === 0 && dot(sub(a, b), sub(c, b)) > 0) return [i, (i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsIntersect(pt(i), pt(i + 1), pt(j), pt(j + 1))) return [i, j];
    }
  }
  return null;
}

export type RingProblem = 'tooFewPoints' | 'noArea' | 'selfIntersects';

export interface RingCheck {
  ok: boolean;
  problem?: RingProblem;
  /** The two crossing edges, when the problem is selfIntersects. */
  edges?: [number, number];
}

/** Whether a ring can be a shape: at least 3 points, some area, and no crossing edges. */
export function checkRing(ring: Ring): RingCheck {
  const pts = dedupeRing(ring);
  if (pts.length < 3) return { ok: false, problem: 'tooFewPoints' };
  // Crossings first: a symmetric bow-tie's two halves cancel to zero area.
  const edges = findSelfIntersection(pts);
  if (edges) return { ok: false, problem: 'selfIntersects', edges };
  if (ringArea(pts) < EPS) return { ok: false, problem: 'noArea' };
  return { ok: true };
}
