/**
 * Geometry operations that work on any map object: shapes, lines, points.
 * Pure functions returning new objects (the store passes them through immer).
 */
import type { BBox, Vec2 } from '../geometry/types.ts';
import { bboxOfPoints, unionBBox } from '../geometry/polygon.ts';
import { rotateAround } from '../geometry/vec.ts';
import { pathPoints } from '../geometry/buffer.ts';
import {
  mirrorShape,
  normalizeDeg,
  rotateShape,
  scaleShape,
  shapeBBox,
  translateShape,
} from '../geometry/transform.ts';
import { footprint } from './totals.ts';
import type { MapObject } from './types.ts';

const movePt = (p: Vec2, dx: number, dy: number): Vec2 => ({ x: p.x + dx, y: p.y + dy });

/** Points that define an object (for bounding boxes and snapping). */
export function objectPoints(o: MapObject): Vec2[] {
  if ('shape' in o) {
    const b = shapeBBox(o.shape);
    return [
      { x: b.minX, y: b.minY },
      { x: b.maxX, y: b.maxY },
    ];
  }
  if ('line' in o) return pathPoints(o.line.points, o.line.smooth);
  if ('at' in o) return [o.at];
  return o.points;
}

/** Bounding box of what's drawn: path surfaces include their width. */
export function objectBBox(o: MapObject): BBox {
  const fp = o.type === 'path' ? footprint(o) : null;
  if (fp && fp.length > 0) return bboxOfPoints(fp.flatMap((p) => p.outer));
  return bboxOfPoints(objectPoints(o));
}

export function objectsBBox(objects: readonly MapObject[]): BBox | null {
  let box: BBox | null = null;
  for (const o of objects) box = box ? unionBBox(box, objectBBox(o)) : objectBBox(o);
  return box;
}

export const bboxCenter = (b: BBox): Vec2 => ({
  x: (b.minX + b.maxX) / 2,
  y: (b.minY + b.maxY) / 2,
});

export function translateObject<T extends MapObject>(o: T, dx: number, dy: number): T {
  if ('shape' in o) {
    const moved = { ...o, shape: translateShape(o.shape, dx, dy) };
    if (o.type === 'habitat') {
      return {
        ...moved,
        zones: o.zones.map((z) => ({ ...z, shape: translateShape(z.shape, dx, dy) })),
      } as T;
    }
    return moved;
  }
  if ('line' in o)
    return { ...o, line: { ...o.line, points: o.line.points.map((p) => movePt(p, dx, dy)) } };
  if ('at' in o) return { ...o, at: movePt(o.at, dx, dy) };
  return {
    ...o,
    points: (o as Extract<MapObject, { type: 'measure' }>).points.map((p) => movePt(p, dx, dy)),
  };
}

export function rotateObject<T extends MapObject>(o: T, deg: number, pivot: Vec2): T {
  if ('shape' in o) {
    const rotated = { ...o, shape: rotateShape(o.shape, deg, pivot) };
    if (o.type === 'habitat') {
      return {
        ...rotated,
        zones: o.zones.map((z) => ({ ...z, shape: rotateShape(z.shape, deg, pivot) })),
      } as T;
    }
    return rotated;
  }
  if ('line' in o) {
    return {
      ...o,
      line: { ...o.line, points: o.line.points.map((p) => rotateAround(p, pivot, deg)) },
    };
  }
  if ('at' in o) {
    return {
      ...o,
      at: rotateAround(o.at, pivot, deg),
      rotationDeg: normalizeDeg(o.rotationDeg + deg),
    };
  }
  const m = o as Extract<MapObject, { type: 'measure' }>;
  return { ...o, points: m.points.map((p) => rotateAround(p, pivot, deg)) };
}

export function scaleObject<T extends MapObject>(o: T, factor: number, origin: Vec2): T {
  const sp = (p: Vec2): Vec2 => ({
    x: origin.x + (p.x - origin.x) * factor,
    y: origin.y + (p.y - origin.y) * factor,
  });
  if ('shape' in o) {
    const scaled = { ...o, shape: scaleShape(o.shape, factor, factor, origin) };
    if (o.type === 'habitat') {
      return {
        ...scaled,
        zones: o.zones.map((z) => ({ ...z, shape: scaleShape(z.shape, factor, factor, origin) })),
      } as T;
    }
    return scaled;
  }
  if ('line' in o) return { ...o, line: { ...o.line, points: o.line.points.map(sp) } };
  if (o.type === 'icon') return { ...o, at: sp(o.at), sizeM: o.sizeM * factor };
  if (o.type === 'label')
    return { ...o, at: sp(o.at), size: o.sizing === 'map' ? o.size * factor : o.size };
  const m = o as Extract<MapObject, { type: 'measure' }>;
  return { ...o, points: m.points.map(sp) };
}

export function mirrorObject<T extends MapObject>(o: T, axis: 'h' | 'v', pivot: Vec2): T {
  const mp = (p: Vec2): Vec2 =>
    axis === 'h' ? { x: 2 * pivot.x - p.x, y: p.y } : { x: p.x, y: 2 * pivot.y - p.y };
  if ('shape' in o) {
    const mirrored = { ...o, shape: mirrorShape(o.shape, axis, pivot) };
    if (o.type === 'habitat') {
      return {
        ...mirrored,
        zones: o.zones.map((z) => ({ ...z, shape: mirrorShape(z.shape, axis, pivot) })),
      } as T;
    }
    return mirrored;
  }
  if ('line' in o) return { ...o, line: { ...o.line, points: o.line.points.map(mp) } };
  if ('at' in o) return { ...o, at: mp(o.at) };
  const m = o as Extract<MapObject, { type: 'measure' }>;
  return { ...o, points: m.points.map(mp) };
}

/**
 * Stretches an object from one bounding box to another (resize handles). Shapes stretch along
 * their own axes; lines, points and a habitat's zones follow the same mapping.
 */
export function resizeObject<T extends MapObject>(o: T, from: BBox, to: BBox): T {
  const fw = from.maxX - from.minX;
  const fh = from.maxY - from.minY;
  const sx = fw > 0 ? (to.maxX - to.minX) / fw : 1;
  const sy = fh > 0 ? (to.maxY - to.minY) / fh : 1;
  const origin = { x: from.minX, y: from.minY };
  const dx = to.minX - from.minX;
  const dy = to.minY - from.minY;
  const mp = (p: Vec2): Vec2 => ({
    x: origin.x + (p.x - origin.x) * sx + dx,
    y: origin.y + (p.y - origin.y) * sy + dy,
  });
  const fit = <S extends MapObject & { shape: unknown }>(shape: S['shape']) =>
    translateShape(scaleShape(shape as never, sx, sy, origin), dx, dy);
  if ('shape' in o) {
    const out = { ...o, shape: fit(o.shape) };
    if (o.type === 'habitat') {
      return { ...out, zones: o.zones.map((z) => ({ ...z, shape: fit(z.shape) })) } as T;
    }
    return out;
  }
  if ('line' in o) return { ...o, line: { ...o.line, points: o.line.points.map(mp) } };
  if ('at' in o) return { ...o, at: mp(o.at) };
  const m = o as Extract<MapObject, { type: 'measure' }>;
  return { ...o, points: m.points.map(mp) };
}

/** Limits a move so the box stays on the map. */
export function clampDelta(
  box: BBox,
  dx: number,
  dy: number,
  widthM: number,
  heightM: number,
): Vec2 {
  const cx = Math.min(Math.max(dx, -box.minX), widthM - box.maxX);
  const cy = Math.min(Math.max(dy, -box.minY), heightM - box.maxY);
  // A box bigger than the map can't be clamped on that axis; leave the move as asked.
  return {
    x: box.maxX - box.minX > widthM ? dx : cx,
    y: box.maxY - box.minY > heightM ? dy : cy,
  };
}
