/**
 * Geometry types. World units are meters; origin (0,0) is the map's north-west corner,
 * +x east, +y south (the same as SVG).
 */
export interface Vec2 {
  x: number;
  y: number;
}

/** A closed ring of points; the closing point is implied (not repeated). */
export type Ring = Vec2[];

/** An outer ring plus holes. Outer rings run clockwise on screen, holes counter-clockwise. */
export interface Poly {
  outer: Ring;
  holes: Ring[];
}

export type MultiPoly = Poly[];

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** A closed shape as stored in a plan (docs/05-data-model.md). */
export type Shape =
  | { kind: 'polygon'; points: Vec2[]; holes?: Vec2[][]; cornerRadiusM?: number }
  | {
      kind: 'rect';
      /** Top-left corner before rotation. Rotation is about the rectangle's centre. */
      x: number;
      y: number;
      w: number;
      h: number;
      rotationDeg: number;
      cornerRadiusM?: number;
    }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotationDeg: number };

/** An open line of at least two points. */
export interface Polyline {
  points: Vec2[];
  smooth: boolean;
}

/** Distances closer than this are equal (meters). */
export const EPS = 1e-6;

/** Curves are flattened so no point strays more than this from the true curve (meters). */
export const CHORD_TOLERANCE_M = 0.05;
