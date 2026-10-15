/** Area-driven sizing: "Resize to area…" and "Add habitat by size…". */
import { EPS, type Shape, type Vec2 } from './types.ts';
import { polyArea } from './polygon.ts';
import { shapeToPoly } from './flatten.ts';
import { rotateShape, scaleShape, shapeCentroid } from './transform.ts';

export const shapeArea = (shape: Shape): number => polyArea(shapeToPoly(shape));

export type ResizeMode = 'uniform' | 'keepWidth' | 'keepHeight';

/**
 * Resizes a closed shape to `targetM2`. Uniform scaling (about the area centroid) is exact.
 * For rectangles, `keepWidth` / `keepHeight` change only the other side, about the centre,
 * refined a few times so rounded corners still land on the target.
 */
export function resizeToArea(shape: Shape, targetM2: number, mode: ResizeMode = 'uniform'): Shape {
  const current = shapeArea(shape);
  if (!(targetM2 > 0) || current < EPS) return shape;
  if (shape.kind === 'rect' && mode !== 'uniform') {
    const cx = shape.x + shape.w / 2;
    const cy = shape.y + shape.h / 2;
    let out: typeof shape = shape;
    for (let i = 0; i < 8; i++) {
      const err = targetM2 - shapeArea(out);
      if (Math.abs(err) < 1e-7) break;
      if (mode === 'keepWidth') {
        const h = Math.max(EPS, out.h + err / out.w);
        out = { ...out, h, y: cy - h / 2 };
      } else {
        const w = Math.max(EPS, out.w + err / out.h);
        out = { ...out, w, x: cx - w / 2 };
      }
    }
    return out;
  }
  const s = Math.sqrt(targetM2 / current);
  return scaleShape(shape, s, s, shapeCentroid(shape));
}

export type SizedShapeKind = 'rect' | 'ellipse' | 'regular';

export interface ShapeFromAreaInput {
  kind: SizedShapeKind;
  areaM2: number;
  /** Width divided by height. 1 = square, circle or regular polygon. */
  aspect: number;
  /** Sides for a regular polygon (3–64). */
  sides?: number;
  center: Vec2;
  rotationDeg?: number;
}

/** A new shape with exactly the requested area, centred on `center`. */
export function shapeFromArea(input: ShapeFromAreaInput): Shape {
  const { areaM2, aspect, center } = input;
  const rotationDeg = input.rotationDeg ?? 0;
  if (input.kind === 'rect') {
    const w = Math.sqrt(areaM2 * aspect);
    const h = areaM2 / w;
    return { kind: 'rect', x: center.x - w / 2, y: center.y - h / 2, w, h, rotationDeg };
  }
  if (input.kind === 'ellipse') {
    const rx = Math.sqrt((areaM2 * aspect) / Math.PI);
    const ry = areaM2 / (Math.PI * rx);
    return { kind: 'ellipse', cx: center.x, cy: center.y, rx, ry, rotationDeg };
  }
  const n = Math.min(64, Math.max(3, Math.round(input.sides ?? 6)));
  const r = Math.sqrt((2 * areaM2) / (n * Math.sin((2 * Math.PI) / n)));
  const sx = Math.sqrt(aspect);
  const points: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    // Start at the top so triangles and pentagons point north.
    const t = -Math.PI / 2 + (2 * Math.PI * i) / n;
    points.push({ x: center.x + r * Math.cos(t) * sx, y: center.y + (r * Math.sin(t)) / sx });
  }
  const polygon: Shape = { kind: 'polygon', points };
  return rotationDeg === 0 ? polygon : rotateShape(polygon, rotationDeg, center);
}
