/** Polygons to SVG path data. Coordinates are meters (the SVG viewBox does the scaling). */
import type { MultiPoly, Poly, Ring, Vec2 } from '../../geometry/types.ts';

const n = (v: number): string => (Math.round(v * 1000) / 1000).toString();

export function ringPath(ring: Ring): string {
  if (ring.length === 0) return '';
  const [first, ...rest] = ring as [Vec2, ...Vec2[]];
  return `M${n(first.x)} ${n(first.y)}${rest.map((p) => `L${n(p.x)} ${n(p.y)}`).join('')}Z`;
}

export const polyPath = (poly: Poly): string => [poly.outer, ...poly.holes].map(ringPath).join('');

export const multiPath = (mp: MultiPoly): string => mp.map(polyPath).join('');

export function linePath(points: readonly Vec2[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points as [Vec2, ...Vec2[]];
  return `M${n(first.x)} ${n(first.y)}${rest.map((p) => `L${n(p.x)} ${n(p.y)}`).join('')}`;
}
