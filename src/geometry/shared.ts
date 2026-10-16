/**
 * Shared walls: the total length along which two rings run on top of each other (collinear,
 * overlapping edges). Used so barrier totals count a wall between two habitats once.
 */
import type { Ring, Vec2 } from './types.ts';
import { distance, dot, sub } from './vec.ts';
import { distanceToSegment } from './snap.ts';

/** Overlap length of segments ab and cd if they lie on the same line (within `tol`), else 0. */
export function collinearOverlap(a: Vec2, b: Vec2, c: Vec2, d: Vec2, tol = 0.01): number {
  const len = distance(a, b);
  if (len === 0 || distance(c, d) === 0) return 0;
  // Both ends of cd must lie on the infinite line through ab.
  const ab = sub(b, a);
  const off = (p: Vec2) => Math.abs(ab.x * (p.y - a.y) - ab.y * (p.x - a.x)) / len;
  if (off(c) > tol || off(d) > tol) return 0;
  // Project cd onto ab and intersect the parameter intervals.
  const t = (p: Vec2) => dot(sub(p, a), ab) / len;
  const t1 = Math.min(t(c), t(d));
  const t2 = Math.max(t(c), t(d));
  return Math.max(0, Math.min(len, t2) - Math.max(0, t1));
}

/** Total length of shared (coincident) boundary between two closed rings. */
export function sharedEdgeLength(ringA: Ring, ringB: Ring, tol = 0.01): number {
  let sum = 0;
  const na = ringA.length;
  const nb = ringB.length;
  for (let i = 0; i < na; i++) {
    const a = ringA[i] as Vec2;
    const b = ringA[(i + 1) % na] as Vec2;
    for (let j = 0; j < nb; j++) {
      const c = ringB[j] as Vec2;
      const d = ringB[(j + 1) % nb] as Vec2;
      // Cheap rejection: segments far apart can't overlap.
      if (
        distanceToSegment(c, a, b) > tol &&
        distanceToSegment(d, a, b) > tol &&
        distanceToSegment(a, c, d) > tol
      ) {
        continue;
      }
      sum += collinearOverlap(a, b, c, d, tol);
    }
  }
  return sum;
}
