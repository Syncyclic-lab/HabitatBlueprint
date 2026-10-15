/** Moving, rotating, scaling and mirroring stored shapes. Inputs are never mutated. */
import type { BBox, Shape, Vec2 } from './types.ts';
import { rotateAround } from './vec.ts';
import { bboxOfPoints, ringCentroid } from './polygon.ts';
import { rectRing, shapeToPoly } from './flatten.ts';

/** Degrees normalised to [0, 360). */
export const normalizeDeg = (deg: number): number => (((deg % 360) + 360) % 360) + 0;

export const shapeBBox = (shape: Shape): BBox => bboxOfPoints(shapeToPoly(shape).outer);

/** Centre of the shape's bounding box: the pivot for rotation and mirroring. */
export function shapeCenter(shape: Shape): Vec2 {
  if (shape.kind === 'rect') return { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 };
  if (shape.kind === 'ellipse') return { x: shape.cx, y: shape.cy };
  const b = bboxOfPoints(shape.points);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

/** Area-weighted centre, used to resize about. */
export const shapeCentroid = (shape: Shape): Vec2 => ringCentroid(shapeToPoly(shape).outer);

type PolygonShape = Extract<Shape, { kind: 'polygon' }>;

const mapPoints = (shape: PolygonShape, f: (p: Vec2) => Vec2): PolygonShape => ({
  ...shape,
  points: shape.points.map(f),
  ...(shape.holes ? { holes: shape.holes.map((h) => h.map(f)) } : {}),
});

export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  switch (shape.kind) {
    case 'polygon':
      return mapPoints(shape, (p) => ({ x: p.x + dx, y: p.y + dy }));
    case 'rect':
      return { ...shape, x: shape.x + dx, y: shape.y + dy };
    case 'ellipse':
      return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
  }
}

/** Rotates clockwise (on screen) by `deg` about `pivot` (default: the shape's centre). */
export function rotateShape(shape: Shape, deg: number, pivot: Vec2 = shapeCenter(shape)): Shape {
  if (shape.kind === 'polygon') return mapPoints(shape, (p) => rotateAround(p, pivot, deg));
  const c = rotateAround(shapeCenter(shape), pivot, deg);
  const rotationDeg = normalizeDeg(shape.rotationDeg + deg);
  if (shape.kind === 'rect') {
    return { ...shape, x: c.x - shape.w / 2, y: c.y - shape.h / 2, rotationDeg };
  }
  return { ...shape, cx: c.x, cy: c.y, rotationDeg };
}

/**
 * Scales about `origin`. Polygons scale in world axes. Rectangles and ellipses scale their own
 * width and height (their local axes) and move their centre, so rotation is kept.
 */
export function scaleShape(shape: Shape, sx: number, sy: number, origin: Vec2): Shape {
  const sp = (p: Vec2): Vec2 => ({
    x: origin.x + (p.x - origin.x) * sx,
    y: origin.y + (p.y - origin.y) * sy,
  });
  if (shape.kind === 'polygon') {
    const scaled = mapPoints(shape, sp);
    return shape.cornerRadiusM === undefined
      ? scaled
      : { ...scaled, cornerRadiusM: shape.cornerRadiusM * Math.min(sx, sy) };
  }
  const c = sp(shapeCenter(shape));
  if (shape.kind === 'rect') {
    const w = shape.w * sx;
    const h = shape.h * sy;
    const out = { ...shape, x: c.x - w / 2, y: c.y - h / 2, w, h };
    return shape.cornerRadiusM === undefined
      ? out
      : { ...out, cornerRadiusM: shape.cornerRadiusM * Math.min(sx, sy) };
  }
  return { ...shape, cx: c.x, cy: c.y, rx: shape.rx * sx, ry: shape.ry * sy };
}

/** Mirrors left↔right ('h') or top↔bottom ('v') about `pivot` (default: the shape's centre). */
export function mirrorShape(
  shape: Shape,
  axis: 'h' | 'v',
  pivot: Vec2 = shapeCenter(shape),
): Shape {
  const m = (p: Vec2): Vec2 =>
    axis === 'h' ? { x: 2 * pivot.x - p.x, y: p.y } : { x: p.x, y: 2 * pivot.y - p.y };
  if (shape.kind === 'polygon') return mapPoints(shape, m);
  const c = m(shapeCenter(shape));
  const rotationDeg = normalizeDeg(-shape.rotationDeg);
  if (shape.kind === 'rect') {
    return { ...shape, x: c.x - shape.w / 2, y: c.y - shape.h / 2, rotationDeg };
  }
  return { ...shape, cx: c.x, cy: c.y, rotationDeg };
}

/** Corner points a user would snap to or edit: polygon points, rectangle corners, ellipse tips. */
export function shapeVertices(shape: Shape): Vec2[] {
  switch (shape.kind) {
    case 'polygon':
      return [...shape.points, ...(shape.holes ?? []).flat()];
    case 'rect':
      return rectRing(shape.x, shape.y, shape.w, shape.h, shape.rotationDeg);
    case 'ellipse': {
      const c = { x: shape.cx, y: shape.cy };
      return [
        { x: shape.cx + shape.rx, y: shape.cy },
        { x: shape.cx, y: shape.cy + shape.ry },
        { x: shape.cx - shape.rx, y: shape.cy },
        { x: shape.cx, y: shape.cy - shape.ry },
      ].map((p) => rotateAround(p, c, shape.rotationDeg));
    }
  }
}

/** Converts any shape into an editable polygon (rectangles keep their corner radius). */
export function toPolygonShape(shape: Shape): Extract<Shape, { kind: 'polygon' }> {
  if (shape.kind === 'polygon') return shape;
  if (shape.kind === 'rect') {
    const points = rectRing(shape.x, shape.y, shape.w, shape.h, shape.rotationDeg);
    return shape.cornerRadiusM === undefined
      ? { kind: 'polygon', points }
      : { kind: 'polygon', points, cornerRadiusM: shape.cornerRadiusM };
  }
  return { kind: 'polygon', points: shapeToPoly(shape).outer };
}

/**
 * Moves and stretches a shape so its bounding box becomes `target`. Zero-size boxes (a line)
 * keep their size on that axis.
 */
export function fitShapeToBox(shape: Shape, target: BBox): Shape {
  const b = shapeBBox(shape);
  const bw = b.maxX - b.minX;
  const bh = b.maxY - b.minY;
  const sx = bw > 0 ? (target.maxX - target.minX) / bw : 1;
  const sy = bh > 0 ? (target.maxY - target.minY) / bh : 1;
  const scaled = scaleShape(shape, sx, sy, { x: b.minX, y: b.minY });
  return translateShape(scaled, target.minX - b.minX, target.minY - b.minY);
}
