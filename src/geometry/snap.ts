/** Snapping: grid, existing vertices, edges and edge midpoints, and angle steps. */
import type { Vec2 } from './types.ts';
import { add, distance, dot, length, midpoint, scale, sub } from './vec.ts';

export const snapToGrid = (p: Vec2, step: number): Vec2 =>
  step > 0 ? { x: Math.round(p.x / step) * step + 0, y: Math.round(p.y / step) * step + 0 } : p;

/** Keeps the distance from `origin` but rounds the direction to the nearest `stepDeg`. */
export function snapAngle(origin: Vec2, p: Vec2, stepDeg: number): Vec2 {
  const d = sub(p, origin);
  const r = length(d);
  if (r === 0 || stepDeg <= 0) return p;
  const step = (stepDeg * Math.PI) / 180;
  const a = Math.round(Math.atan2(d.y, d.x) / step) * step;
  return { x: origin.x + r * Math.cos(a), y: origin.y + r * Math.sin(a) };
}

export function nearestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / len2));
  return add(a, scale(ab, t));
}

export const distanceToSegment = (p: Vec2, a: Vec2, b: Vec2): number =>
  distance(p, nearestPointOnSegment(p, a, b));

export type SnapKind = 'vertex' | 'midpoint' | 'edge' | 'grid' | 'none';

export interface SnapTargets {
  vertices: readonly Vec2[];
  segments: readonly (readonly [Vec2, Vec2])[];
}

export interface SnapOptions {
  /** Grid step in meters, or 0 for no grid snapping. */
  gridM: number;
  vertices: boolean;
  edges: boolean;
  /** How close (meters) a vertex or edge must be to win over the grid. */
  toleranceM: number;
}

export interface SnapResult {
  point: Vec2;
  kind: SnapKind;
}

/** Priority: vertex, then edge midpoint, then edge, then grid. */
export function snapPoint(p: Vec2, targets: SnapTargets, options: SnapOptions): SnapResult {
  const tol = options.toleranceM;
  if (options.vertices) {
    let best: Vec2 | null = null;
    let bestD = tol;
    for (const v of targets.vertices) {
      const d = distance(p, v);
      if (d <= bestD) {
        best = v;
        bestD = d;
      }
    }
    if (best) return { point: best, kind: 'vertex' };
  }
  if (options.edges) {
    let best: SnapResult | null = null;
    let bestD = tol;
    for (const [a, b] of targets.segments) {
      const m = midpoint(a, b);
      const dm = distance(p, m);
      if (dm <= bestD) {
        best = { point: m, kind: 'midpoint' };
        bestD = dm;
        continue;
      }
      const q = nearestPointOnSegment(p, a, b);
      const dq = distance(p, q);
      if (dq < bestD && best?.kind !== 'midpoint') {
        best = { point: q, kind: 'edge' };
        bestD = dq;
      }
    }
    if (best) return best;
  }
  if (options.gridM > 0) return { point: snapToGrid(p, options.gridM), kind: 'grid' };
  return { point: p, kind: 'none' };
}

/** Keeps a point inside the map rectangle. */
export const clampToMap = (p: Vec2, widthM: number, heightM: number): Vec2 => ({
  x: Math.min(widthM, Math.max(0, p.x)),
  y: Math.min(heightM, Math.max(0, p.y)),
});
