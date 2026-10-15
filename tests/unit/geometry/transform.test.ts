import { describe, expect, it } from 'vitest';
import {
  fitShapeToBox,
  mirrorShape,
  normalizeDeg,
  rotateShape,
  scaleShape,
  shapeBBox,
  shapeCenter,
  shapeCentroid,
  shapeVertices,
  toPolygonShape,
  translateShape,
} from '../../../src/geometry/transform';
import { resizeToArea, shapeArea, shapeFromArea } from '../../../src/geometry/resize';
import { measureHabitat, zoneArea } from '../../../src/geometry/measure';
import type { Shape } from '../../../src/geometry/types';

const poly: Shape = {
  kind: 'polygon',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
};
const polyWithHole: Shape = {
  ...poly,
  holes: [
    [
      { x: 2, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 4 },
    ],
  ],
};
const rect: Shape = { kind: 'rect', x: 0, y: 0, w: 20, h: 10, rotationDeg: 0 };
const rectRounded: Shape = { ...rect, cornerRadiusM: 2 };
const ellipse: Shape = { kind: 'ellipse', cx: 10, cy: 10, rx: 5, ry: 3, rotationDeg: 0 };

describe('transforms', () => {
  it('normalises angles to [0, 360)', () => {
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(720)).toBe(0);
  });

  it('finds bounding boxes, centres and centroids', () => {
    expect(shapeBBox(rect)).toEqual({ minX: 0, minY: 0, maxX: 20, maxY: 10 });
    expect(shapeCenter(rect)).toEqual({ x: 10, y: 5 });
    expect(shapeCenter(ellipse)).toEqual({ x: 10, y: 10 });
    expect(shapeCenter(poly)).toEqual({ x: 5, y: 5 });
    expect(shapeCentroid(poly)).toEqual({ x: 5, y: 5 });
  });

  it('translates every kind', () => {
    expect(translateShape(rect, 1, 2)).toMatchObject({ x: 1, y: 2 });
    expect(translateShape(ellipse, 1, 2)).toMatchObject({ cx: 11, cy: 12 });
    const moved = translateShape(polyWithHole, 1, 1);
    expect(moved.kind === 'polygon' && moved.points[0]).toEqual({ x: 1, y: 1 });
    expect(moved.kind === 'polygon' && moved.holes?.[0]?.[0]).toEqual({ x: 3, y: 3 });
    const plain = translateShape(poly, 1, 1);
    expect(plain.kind === 'polygon' && plain.holes).toBeUndefined();
  });

  it('rotates every kind, keeping area', () => {
    const r = rotateShape(rect, 90);
    expect(r).toMatchObject({ rotationDeg: 90, w: 20, h: 10 });
    expect(shapeArea(r)).toBeCloseTo(200, 9);
    const e = rotateShape(ellipse, 45, { x: 0, y: 0 });
    expect(e.kind === 'ellipse' && e.rotationDeg).toBe(45);
    const p = rotateShape(poly, 90);
    expect(shapeArea(p)).toBeCloseTo(100, 9);
  });

  it('scales every kind, including corner radii', () => {
    expect(shapeArea(scaleShape(poly, 2, 2, { x: 0, y: 0 }))).toBeCloseTo(400, 9);
    const roundedPoly = scaleShape({ ...poly, cornerRadiusM: 1 }, 2, 3, { x: 0, y: 0 });
    expect(roundedPoly.kind === 'polygon' && roundedPoly.cornerRadiusM).toBe(2);
    expect(scaleShape(rect, 2, 1, { x: 0, y: 0 })).toMatchObject({ w: 40, h: 10 });
    expect(scaleShape(rectRounded, 0.5, 1, { x: 0, y: 0 })).toMatchObject({ cornerRadiusM: 1 });
    expect(scaleShape(ellipse, 2, 2, { x: 10, y: 10 })).toMatchObject({ rx: 10, ry: 6, cx: 10 });
  });

  it('mirrors every kind both ways', () => {
    const m = mirrorShape(poly, 'h', { x: 0, y: 0 });
    expect(m.kind === 'polygon' && m.points[1]).toEqual({ x: -10, y: 0 });
    const mv = mirrorShape(poly, 'v');
    expect(shapeArea(mv)).toBeCloseTo(100, 9);
    expect(mirrorShape({ ...rect, rotationDeg: 30 }, 'h')).toMatchObject({
      rotationDeg: 330,
      x: 0,
    });
    expect(mirrorShape({ ...ellipse, rotationDeg: 30 }, 'v')).toMatchObject({
      rotationDeg: 330,
      cy: 10,
    });
  });

  it('lists vertices for every kind', () => {
    expect(shapeVertices(polyWithHole)).toHaveLength(7);
    expect(shapeVertices(poly)).toHaveLength(4);
    expect(shapeVertices(rect)).toHaveLength(4);
    expect(shapeVertices(ellipse)[0]).toEqual({ x: 15, y: 10 });
  });

  it('converts shapes to editable polygons', () => {
    expect(toPolygonShape(poly)).toBe(poly);
    expect(toPolygonShape(rect).points).toHaveLength(4);
    expect(toPolygonShape(rectRounded).cornerRadiusM).toBe(2);
    expect(toPolygonShape(rect).cornerRadiusM).toBeUndefined();
    expect(shapeArea(toPolygonShape(ellipse))).toBeCloseTo(Math.PI * 15, 9);
  });

  it('fits a shape to a new bounding box', () => {
    const fitted = fitShapeToBox(poly, { minX: 5, minY: 5, maxX: 25, maxY: 10 });
    expect(shapeBBox(fitted)).toEqual({ minX: 5, minY: 5, maxX: 25, maxY: 10 });
    const flat: Shape = {
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 0, y: 5 },
      ],
    };
    expect(shapeBBox(fitShapeToBox(flat, { minX: 1, minY: 1, maxX: 1, maxY: 2 }))).toEqual({
      minX: 1,
      minY: 1,
      maxX: 1,
      maxY: 2,
    });
    const horizontal: Shape = {
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 0 },
      ],
    };
    expect(shapeBBox(fitShapeToBox(horizontal, { minX: 0, minY: 3, maxX: 20, maxY: 3 })).maxX).toBe(
      20,
    );
  });
});

describe('resizing by area', () => {
  it('scales uniformly to the target', () => {
    expect(shapeArea(resizeToArea(ellipse, 500))).toBeCloseTo(500, 6);
    expect(shapeArea(resizeToArea(rect, 50))).toBeCloseTo(50, 6);
  });

  it('keeps the width or height of rectangles, even with rounded corners', () => {
    const kw = resizeToArea(rectRounded, 300, 'keepWidth');
    expect(kw).toMatchObject({ w: 20 });
    expect(shapeArea(kw)).toBeCloseTo(300, 4);
    const kh = resizeToArea(rectRounded, 300, 'keepHeight');
    expect(kh).toMatchObject({ h: 10 });
    expect(shapeArea(kh)).toBeCloseTo(300, 4);
    expect(resizeToArea(rect, 200, 'keepWidth')).toEqual(rect);
  });

  it('leaves shapes alone for bad targets or no area', () => {
    expect(resizeToArea(rect, 0)).toBe(rect);
    expect(resizeToArea(rect, Number.NaN)).toBe(rect);
    const flat: Shape = {
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
    };
    expect(resizeToArea(flat, 10)).toBe(flat);
  });

  it('creates shapes with exactly the requested area', () => {
    const c = { x: 100, y: 100 };
    expect(
      shapeArea(shapeFromArea({ kind: 'rect', areaM2: 1500, aspect: 1.5, center: c })),
    ).toBeCloseTo(1500, 6);
    expect(
      shapeArea(shapeFromArea({ kind: 'ellipse', areaM2: 1500, aspect: 1, center: c })),
    ).toBeCloseTo(1500, 6);
    expect(
      shapeArea(
        shapeFromArea({
          kind: 'regular',
          areaM2: 1500,
          aspect: 2,
          sides: 5,
          center: c,
          rotationDeg: 20,
        }),
      ),
    ).toBeCloseTo(1500, 6);
    const hex = shapeFromArea({ kind: 'regular', areaM2: 900, aspect: 1, center: c });
    expect(hex.kind === 'polygon' && hex.points).toHaveLength(6);
    const tooMany = shapeFromArea({
      kind: 'regular',
      areaM2: 900,
      aspect: 1,
      sides: 500,
      center: c,
    });
    expect(tooMany.kind === 'polygon' && tooMany.points).toHaveLength(64);
  });
});

describe('habitat measures', () => {
  const box: Shape = { kind: 'rect', x: 0, y: 0, w: 40, h: 40, rotationDeg: 0 };

  it('reports climbing and shelter separately', () => {
    const m = measureHabitat(
      {
        kind: 'habitat',
        shape: box,
        zones: [
          { kind: 'climbing', shape: { kind: 'rect', x: 0, y: 0, w: 10, h: 10, rotationDeg: 0 } },
          { kind: 'shelter', shape: { kind: 'rect', x: 20, y: 0, w: 5, h: 4, rotationDeg: 0 } },
        ],
      },
      1_000_000,
    );
    expect(m.climbingM2).toBeCloseTo(100, 6);
    expect(m.shelterM2).toBeCloseTo(20, 6);
    expect(m.landM2).toBeCloseTo(1600, 6);
    expect(m.flyingM2).toBe(0);
  });

  it('counts the whole aviary as flying space unless flying zones are drawn', () => {
    expect(measureHabitat({ kind: 'aviary', shape: box, zones: [] }, 1).flyingM2).toBeCloseTo(
      1600,
      6,
    );
    const zoned = measureHabitat(
      {
        kind: 'aviary',
        shape: box,
        zones: [
          { kind: 'flying', shape: { kind: 'rect', x: 0, y: 0, w: 20, h: 40, rotationDeg: 0 } },
        ],
      },
      1,
    );
    expect(zoned.flyingM2).toBeCloseTo(800, 6);
  });

  it('reports 0% of an empty map instead of dividing by zero', () => {
    expect(measureHabitat({ kind: 'exhibit', shape: box, zones: [] }, 0).pctOfMap).toBe(0);
  });

  it('returns no zone area when there are no zones of that kind', () => {
    expect(zoneArea([], [], ['water'])).toEqual([]);
  });
});
