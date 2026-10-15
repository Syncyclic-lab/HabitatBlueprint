/**
 * The golden geometry cases from docs/12-testing-and-qa.md and docs/03 §3.1/§3.3.
 * These numbers are the product: if one fails, fix the code, not the test.
 */
import { describe, expect, it } from 'vitest';
import { shapeToPoly } from '../../../src/geometry/flatten';
import { multiArea, polyArea, polyPerimeter, ringPerimeter } from '../../../src/geometry/polygon';
import { unionAll } from '../../../src/geometry/clip';
import { measureHabitat } from '../../../src/geometry/measure';
import { bufferPolyline, polylineLength } from '../../../src/geometry/buffer';
import { checkRing } from '../../../src/geometry/intersect';
import { resizeToArea, shapeArea } from '../../../src/geometry/resize';
import type { Shape } from '../../../src/geometry/types';
import { DEFAULT_PRESET } from '../../../src/data/index';

const MAP_M2 = DEFAULT_PRESET.widthM * DEFAULT_PRESET.heightM;
const rect = (x: number, y: number, w: number, h: number): Shape => ({
  kind: 'rect',
  x,
  y,
  w,
  h,
  rotationDeg: 0,
});

describe('golden geometry cases', () => {
  it('rectangle 50 × 40 m: 2,000 m², 180 m perimeter, 0.20% of a 1,000,000 m² map', () => {
    const m = measureHabitat(
      { kind: 'habitat', shape: rect(100, 100, 50, 40), zones: [] },
      1_000_000,
    );
    expect(m.totalM2).toBeCloseTo(2000, 9);
    expect(m.perimeterM).toBeCloseTo(180, 9);
    expect((m.pctOfMap * 100).toFixed(2)).toBe('0.20');
  });

  it('circle r = 10 m reads 314.16 m² (well within 0.1%)', () => {
    const a = shapeArea({ kind: 'ellipse', cx: 50, cy: 50, rx: 10, ry: 10, rotationDeg: 0 });
    expect(Math.abs(a - Math.PI * 100) / (Math.PI * 100)).toBeLessThan(0.001);
    expect(a.toFixed(2)).toBe('314.16');
  });

  it('L-shape (0,0)(30,0)(30,10)(10,10)(10,30)(0,30) reads 500 m², perimeter 120 m', () => {
    const shape: Shape = {
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 30 },
        { x: 0, y: 30 },
      ],
    };
    const poly = shapeToPoly(shape);
    expect(polyArea(poly)).toBeCloseTo(500, 9);
    expect(ringPerimeter(poly.outer)).toBeCloseTo(120, 9);
  });

  it('square 20 × 20 with a 5 × 5 hole reads 375 m²', () => {
    const poly = shapeToPoly({
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 },
      ],
      holes: [
        [
          { x: 5, y: 5 },
          { x: 10, y: 5 },
          { x: 10, y: 10 },
          { x: 5, y: 10 },
        ],
      ],
    });
    expect(polyArea(poly)).toBeCloseTo(375, 9);
    expect(polyPerimeter(poly)).toBeCloseTo(100, 9);
  });

  it('two 10 × 10 squares overlapping by 5 × 10: union is 150 m², not 200', () => {
    const u = unionAll([[shapeToPoly(rect(0, 0, 10, 10))], [shapeToPoly(rect(5, 0, 10, 10))]]);
    expect(multiArea(u)).toBeCloseTo(150, 6);
  });

  it('habitat 40 × 40, water 10 × 10, deep water 5 × 5 inside the water', () => {
    const m = measureHabitat(
      {
        kind: 'habitat',
        shape: rect(0, 0, 40, 40),
        zones: [
          { kind: 'water', shape: rect(20, 20, 10, 10) },
          { kind: 'deepWater', shape: rect(22, 22, 5, 5) },
        ],
      },
      MAP_M2,
    );
    expect(m.totalM2).toBeCloseTo(1600, 6);
    expect(m.waterM2).toBeCloseTo(100, 6);
    expect(m.deepWaterM2).toBeCloseTo(25, 6);
    expect(m.landM2).toBeCloseTo(1500, 6);
  });

  it('a water zone half outside its habitat only counts the inside half', () => {
    const m = measureHabitat(
      {
        kind: 'habitat',
        shape: rect(0, 0, 40, 40),
        zones: [{ kind: 'water', shape: rect(35, 10, 10, 10) }],
      },
      MAP_M2,
    );
    expect(m.waterM2).toBeCloseTo(50, 6);
    expect(m.landM2).toBeCloseTo(1550, 6);
  });

  it('guest path 100 m × 4 m: round caps ≈ 412.57 m², flat caps exactly 400 m², length 100.0 m', () => {
    const pts = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ];
    expect(polylineLength(pts)).toBeCloseTo(100, 9);
    expect(multiArea(bufferPolyline(pts, 4, 'round'))).toBeCloseTo(400 + Math.PI * 4, 2);
    expect(multiArea(bufferPolyline(pts, 4, 'flat'))).toBeCloseTo(400, 6);
  });

  it('a diagonal path keeps the same exact area', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 60, y: 80 },
    ];
    expect(multiArea(bufferPolyline(pts, 4, 'round'))).toBeCloseTo(400 + Math.PI * 4, 2);
  });

  it('resize-to-area on a polygon lands within 0.01 m² of 1,234 m²', () => {
    const shape: Shape = {
      kind: 'polygon',
      points: [
        { x: 3, y: 7 },
        { x: 41, y: 2 },
        { x: 55, y: 30 },
        { x: 20, y: 45 },
        { x: 8, y: 28 },
      ],
    };
    expect(Math.abs(shapeArea(resizeToArea(shape, 1234)) - 1234)).toBeLessThan(0.01);
  });

  it('a map preset of 1000 × 990 recomputes % of map', () => {
    const m = measureHabitat(
      { kind: 'habitat', shape: rect(0, 0, 99, 100), zones: [] },
      1000 * 990,
    );
    expect(m.pctOfMap).toBeCloseTo(9900 / 990_000, 12);
  });

  it('a self-intersecting bow-tie is rejected with an error code', () => {
    const result = checkRing([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.problem).toBe('selfIntersects');
  });
});
