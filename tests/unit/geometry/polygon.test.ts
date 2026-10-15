import { describe, expect, it } from 'vitest';
import {
  bboxOfMulti,
  bboxOfPoints,
  bboxesOverlap,
  dedupeRing,
  multiArea,
  multiPerimeter,
  normalizePoly,
  orientRing,
  pointInMulti,
  pointInPoly,
  pointInRing,
  polyArea,
  ringArea,
  ringCentroid,
  ringPerimeter,
  signedArea,
  unionBBox,
} from '../../../src/geometry/polygon';
import {
  add,
  angleDeg,
  cross,
  distance,
  dot,
  length,
  lerp,
  midpoint,
  pointsEqual,
  rotateAround,
  roundCoord,
  roundPoint,
  scale,
  sub,
  vec,
} from '../../../src/geometry/vec';
import type { Poly, Ring } from '../../../src/geometry/types';

const square = (x: number, y: number, s: number): Ring => [
  { x, y },
  { x: x + s, y },
  { x: x + s, y: y + s },
  { x, y: y + s },
];

describe('vec', () => {
  it('does basic arithmetic', () => {
    expect(vec(1, 2)).toEqual({ x: 1, y: 2 });
    expect(add(vec(1, 2), vec(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(vec(1, 2), vec(3, 4))).toEqual({ x: -2, y: -2 });
    expect(scale(vec(1, 2), 3)).toEqual({ x: 3, y: 6 });
    expect(dot(vec(1, 2), vec(3, 4))).toBe(11);
    expect(cross(vec(1, 0), vec(0, 1))).toBe(1);
    expect(length(vec(3, 4))).toBe(5);
    expect(distance(vec(0, 0), vec(3, 4))).toBe(5);
    expect(lerp(vec(0, 0), vec(10, 20), 0.25)).toEqual({ x: 2.5, y: 5 });
    expect(midpoint(vec(0, 0), vec(10, 20))).toEqual({ x: 5, y: 10 });
  });

  it('rotates clockwise on screen for positive degrees', () => {
    const p = rotateAround(vec(10, 0), vec(0, 0), 90);
    expect(p.x).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(10, 12);
  });

  it('rounds to 1 cm without producing negative zero', () => {
    expect(roundCoord(1.23456)).toBe(1.23);
    expect(Object.is(roundCoord(-0.001), 0)).toBe(true);
    expect(roundPoint(vec(1.005001, 2.004))).toEqual({ x: 1.01, y: 2 });
  });

  it('compares points with a tolerance on both axes', () => {
    expect(pointsEqual(vec(0, 0), vec(0, 0))).toBe(true);
    expect(pointsEqual(vec(0, 0), vec(1, 0))).toBe(false);
    expect(pointsEqual(vec(0, 0), vec(0, 1))).toBe(false);
    expect(pointsEqual(vec(0, 0), vec(0.05, 0), 0.1)).toBe(true);
  });

  it('reports angles clockwise from east', () => {
    expect(angleDeg(vec(0, 0), vec(0, 10))).toBe(90);
  });
});

describe('polygon measures', () => {
  it('signed area is positive for clockwise-on-screen rings', () => {
    expect(signedArea(square(0, 0, 10))).toBe(100);
    expect(signedArea([...square(0, 0, 10)].reverse())).toBe(-100);
    expect(ringArea([...square(0, 0, 10)].reverse())).toBe(100);
  });

  it('measures perimeter, holes and multipolygons', () => {
    expect(ringPerimeter(square(0, 0, 10))).toBe(40);
    const withHole: Poly = { outer: square(0, 0, 20), holes: [square(5, 5, 5)] };
    expect(polyArea(withHole)).toBe(375);
    expect(multiArea([withHole, { outer: square(100, 100, 1), holes: [] }])).toBe(376);
    expect(multiPerimeter([withHole])).toBe(100);
  });

  it('removes consecutive and closing duplicates', () => {
    const ring = [vec(0, 0), vec(0, 0), vec(10, 0), vec(10, 10), vec(0, 0)];
    expect(dedupeRing(ring)).toEqual([vec(0, 0), vec(10, 0), vec(10, 10)]);
    expect(dedupeRing([])).toEqual([]);
    expect(dedupeRing([vec(1, 1), vec(1, 1)])).toEqual([vec(1, 1)]);
  });

  it('orients rings and normalises polygons', () => {
    const ccw = [...square(0, 0, 10)].reverse();
    expect(signedArea(orientRing(ccw, true))).toBeGreaterThan(0);
    expect(orientRing(square(0, 0, 10), true)).toEqual(square(0, 0, 10));
    const p = normalizePoly({ outer: ccw, holes: [square(2, 2, 2)] });
    expect(signedArea(p.outer)).toBeGreaterThan(0);
    expect(signedArea(p.holes[0] as Ring)).toBeLessThan(0);
  });

  it('finds the centroid, falling back to the mean for flat rings', () => {
    expect(ringCentroid(square(0, 0, 10))).toEqual({ x: 5, y: 5 });
    expect(ringCentroid([vec(0, 0), vec(10, 0), vec(20, 0)])).toEqual({ x: 10, y: 0 });
    expect(ringCentroid([])).toEqual({ x: 0, y: 0 });
  });

  it('computes and combines bounding boxes', () => {
    const b = bboxOfPoints(square(1, 2, 3));
    expect(b).toEqual({ minX: 1, minY: 2, maxX: 4, maxY: 5 });
    expect(
      bboxOfMulti([
        { outer: square(0, 0, 1), holes: [] },
        { outer: square(5, 5, 1), holes: [] },
      ]),
    ).toEqual({
      minX: 0,
      minY: 0,
      maxX: 6,
      maxY: 6,
    });
    expect(unionBBox(b, { minX: 0, minY: 0, maxX: 1, maxY: 1 })).toEqual({
      minX: 0,
      minY: 0,
      maxX: 4,
      maxY: 5,
    });
  });

  it('tests bounding-box overlap on every side', () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(bboxesOverlap(a, { minX: 11, minY: 0, maxX: 12, maxY: 1 })).toBe(false);
    expect(bboxesOverlap(a, { minX: -5, minY: 0, maxX: -1, maxY: 1 })).toBe(false);
    expect(bboxesOverlap(a, { minX: 0, minY: 11, maxX: 1, maxY: 12 })).toBe(false);
    expect(bboxesOverlap(a, { minX: 0, minY: -5, maxX: 1, maxY: -1 })).toBe(false);
    expect(bboxesOverlap(a, { minX: 5, minY: 5, maxX: 15, maxY: 15 })).toBe(true);
  });

  it('tests point containment, including holes', () => {
    const poly: Poly = { outer: square(0, 0, 20), holes: [square(5, 5, 5)] };
    expect(pointInRing(vec(1, 1), square(0, 0, 20))).toBe(true);
    expect(pointInRing(vec(30, 1), square(0, 0, 20))).toBe(false);
    expect(pointInPoly(vec(1, 1), poly)).toBe(true);
    expect(pointInPoly(vec(7, 7), poly)).toBe(false);
    expect(pointInPoly(vec(30, 30), poly)).toBe(false);
    expect(pointInMulti(vec(1, 1), [poly])).toBe(true);
  });
});
