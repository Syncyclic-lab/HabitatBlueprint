/** Area, perimeter, orientation, centroid and containment for rings and polygons. */
import { EPS, type BBox, type MultiPoly, type Poly, type Ring, type Vec2 } from './types.ts';
import { distance, pointsEqual } from './vec.ts';

/**
 * Shoelace formula. Positive for rings that run clockwise on screen (y down).
 * Rings are closed implicitly: the last point connects back to the first.
 */
export function signedArea(ring: Ring): number {
  let sum = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i] as Vec2;
    const b = ring[(i + 1) % n] as Vec2;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export const ringArea = (ring: Ring): number => Math.abs(signedArea(ring));

export function ringPerimeter(ring: Ring): number {
  let sum = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) sum += distance(ring[i] as Vec2, ring[(i + 1) % n] as Vec2);
  return sum;
}

export function polyArea(poly: Poly): number {
  return poly.holes.reduce((a, h) => a - ringArea(h), ringArea(poly.outer));
}

export const multiArea = (mp: MultiPoly): number => mp.reduce((a, p) => a + polyArea(p), 0);

export function polyPerimeter(poly: Poly): number {
  return poly.holes.reduce((a, h) => a + ringPerimeter(h), ringPerimeter(poly.outer));
}

export const multiPerimeter = (mp: MultiPoly): number =>
  mp.reduce((a, p) => a + polyPerimeter(p), 0);

/** Removes repeated consecutive points, including a closing point equal to the first. */
export function dedupeRing(ring: Ring, eps = EPS): Ring {
  const out: Ring = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || !pointsEqual(last, p, eps)) out.push(p);
  }
  while (out.length > 1 && pointsEqual(out[0] as Vec2, out[out.length - 1] as Vec2, eps)) out.pop();
  return out;
}

/** Returns the ring running clockwise (true) or counter-clockwise (false) on screen. */
export function orientRing(ring: Ring, clockwise: boolean): Ring {
  return signedArea(ring) > 0 === clockwise ? ring : [...ring].reverse();
}

/** Outer ring clockwise, holes counter-clockwise, duplicates removed (docs/06). */
export function normalizePoly(poly: Poly): Poly {
  return {
    outer: orientRing(dedupeRing(poly.outer), true),
    holes: poly.holes.map((h) => orientRing(dedupeRing(h), false)),
  };
}

/** Area-weighted centroid; the mean of the points if the ring has no area. */
export function ringCentroid(ring: Ring): Vec2 {
  const a = signedArea(ring);
  const n = ring.length;
  if (Math.abs(a) < EPS) {
    const sx = ring.reduce((s, p) => s + p.x, 0);
    const sy = ring.reduce((s, p) => s + p.y, 0);
    return { x: sx / Math.max(n, 1), y: sy / Math.max(n, 1) };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const p = ring[i] as Vec2;
    const q = ring[(i + 1) % n] as Vec2;
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function bboxOfPoints(points: readonly Vec2[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export const bboxOfMulti = (mp: MultiPoly): BBox => bboxOfPoints(mp.flatMap((p) => p.outer));

export function unionBBox(a: BBox, b: BBox): BBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export const bboxesOverlap = (a: BBox, b: BBox): boolean =>
  a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;

/** Even-odd ray casting. Points exactly on an edge may land on either side. */
export function pointInRing(p: Vec2, ring: Ring): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i] as Vec2;
    const b = ring[j] as Vec2;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export const pointInPoly = (p: Vec2, poly: Poly): boolean =>
  pointInRing(p, poly.outer) && !poly.holes.some((h) => pointInRing(p, h));

export const pointInMulti = (p: Vec2, mp: MultiPoly): boolean =>
  mp.some((poly) => pointInPoly(p, poly));
