/** Small 2D vector helpers. Pure functions; inputs are never mutated. */
import { EPS, type Vec2 } from './types.ts';

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

/** z-component of the 3D cross product. Positive when b is clockwise from a on screen. */
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;

export const length = (a: Vec2): number => Math.hypot(a.x, a.y);

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const midpoint = (a: Vec2, b: Vec2): Vec2 => lerp(a, b, 0.5);

/** Rotates p about c. Positive degrees turn clockwise on screen (y points down). */
export function rotateAround(p: Vec2, c: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

/** Rounds to the 0.01 m storage precision (docs: coordinates are stored to 1 cm). */
export const roundCoord = (n: number): number => Math.round(n * 100) / 100 + 0;

export const roundPoint = (p: Vec2): Vec2 => ({ x: roundCoord(p.x), y: roundCoord(p.y) });

export const pointsEqual = (a: Vec2, b: Vec2, eps = EPS): boolean =>
  Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;

/** Angle of the vector from a to b, in degrees clockwise from east. */
export const angleDeg = (a: Vec2, b: Vec2): number =>
  (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
