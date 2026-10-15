import { describe, expect, it } from 'vitest';
import {
  arcAreaFactor,
  areaPreservingFactor,
  catmullRom,
  ellipseRing,
  rectRing,
  roundCorners,
  segmentsForRadius,
  shapeToPoly,
} from '../../../src/geometry/flatten';
import { polyArea, ringArea, signedArea } from '../../../src/geometry/polygon';
import { distance } from '../../../src/geometry/vec';
import { CHORD_TOLERANCE_M, type Vec2 } from '../../../src/geometry/types';

describe('segmentsForRadius', () => {
  it('uses the minimum for tiny radii', () => {
    expect(segmentsForRadius(0.01)).toBe(16);
  });

  it('meets the chord tolerance, in multiples of 4', () => {
    const n = segmentsForRadius(10);
    expect(n % 4).toBe(0);
    expect(10 * (1 - Math.cos(Math.PI / n))).toBeLessThanOrEqual(CHORD_TOLERANCE_M);
  });

  it('caps very large radii', () => {
    expect(segmentsForRadius(1e7)).toBe(1024);
  });

  it('area factor is slightly above 1', () => {
    expect(areaPreservingFactor(32)).toBeGreaterThan(1);
    expect(areaPreservingFactor(32)).toBeLessThan(1.01);
  });
});

describe('ellipseRing', () => {
  it('has exactly the true area and stays within the chord tolerance of the curve', () => {
    const ring = ellipseRing(0, 0, 10, 10);
    expect(ringArea(ring)).toBeCloseTo(Math.PI * 100, 9);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i] as Vec2;
      const b = ring[(i + 1) % ring.length] as Vec2;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      expect(Math.abs(distance(a, { x: 0, y: 0 }) - 10)).toBeLessThanOrEqual(CHORD_TOLERANCE_M);
      expect(Math.abs(distance(mid, { x: 0, y: 0 }) - 10)).toBeLessThanOrEqual(CHORD_TOLERANCE_M);
    }
    expect(signedArea(ring)).toBeGreaterThan(0);
  });

  it('keeps the area when rotated or phased', () => {
    expect(ringArea(ellipseRing(5, 5, 20, 8, 33))).toBeCloseTo(Math.PI * 160, 6);
    expect(ringArea(ellipseRing(5, 5, 20, 8, 0, 45))).toBeCloseTo(Math.PI * 160, 6);
  });
});

describe('roundCorners', () => {
  const sq: Vec2[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('returns the ring unchanged for no radius or too few points', () => {
    expect(roundCorners(sq, 0)).toEqual(sq);
    expect(roundCorners(sq.slice(0, 2), 2)).toEqual(sq.slice(0, 2));
  });

  it('gives exactly the true rounded-rectangle area', () => {
    expect(ringArea(roundCorners(sq, 2))).toBeCloseTo(100 - (4 - Math.PI) * 4, 9);
  });

  it('shrinks the radius when edges are too short (a 10 m square becomes a 5 m circle)', () => {
    expect(ringArea(roundCorners(sq, 50))).toBeCloseTo(Math.PI * 25, 9);
  });

  it('keeps arc points within the chord tolerance of the true arc', () => {
    const ring = roundCorners(sq, 3);
    // Corner centre for the top-left corner is (3, 3); every arc point near it is ~3 m away.
    const near = ring.filter((p) => p.x < 3 && p.y < 3);
    for (const p of near) {
      expect(Math.abs(Math.hypot(p.x - 3, p.y - 3) - 3)).toBeLessThanOrEqual(CHORD_TOLERANCE_M);
    }
  });

  it('solves the arc factor for two or more segments', () => {
    expect(arcAreaFactor(2, 0.3)).toBeCloseTo(0.3 / Math.sin(0.3), 12);
    const k = arcAreaFactor(5, 0.2);
    expect(3 * k * k + 2 * k).toBeCloseTo((5 * 0.2) / Math.sin(0.2), 12);
  });

  it('keeps straight-through points', () => {
    const withMid: Vec2[] = [{ x: 0, y: 0 }, { x: 5, y: 0 }, ...sq.slice(1)];
    const rounded = roundCorners(withMid, 1);
    expect(rounded).toContainEqual({ x: 5, y: 0 });
  });

  it('uses the minimum of two segments for arcs smaller than the tolerance', () => {
    const rounded = roundCorners(sq, 0.01);
    expect(rounded.length).toBe(12);
    expect(ringArea(rounded)).toBeCloseTo(100 - (4 - Math.PI) * 0.0001, 9);
  });
});

describe('rectRing and shapeToPoly', () => {
  it('builds plain, rotated and rounded rectangles', () => {
    expect(ringArea(rectRing(0, 0, 10, 4))).toBe(40);
    expect(ringArea(rectRing(0, 0, 10, 4, 30))).toBeCloseTo(40, 9);
    expect(ringArea(rectRing(0, 0, 10, 4, 0, 1))).toBeLessThan(40);
  });

  it('converts every shape kind', () => {
    expect(polyArea(shapeToPoly({ kind: 'rect', x: 0, y: 0, w: 5, h: 5, rotationDeg: 0 }))).toBe(
      25,
    );
    expect(
      polyArea(
        shapeToPoly({ kind: 'rect', x: 0, y: 0, w: 5, h: 5, rotationDeg: 10, cornerRadiusM: 1 }),
      ),
    ).toBeLessThan(25);
    expect(
      polyArea(shapeToPoly({ kind: 'ellipse', cx: 0, cy: 0, rx: 3, ry: 2, rotationDeg: 0 })),
    ).toBeCloseTo(Math.PI * 6, 9);
    const tri = shapeToPoly({
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ],
    });
    expect(polyArea(tri)).toBe(50);
    expect(signedArea(tri.outer)).toBeGreaterThan(0);
    const rounded = shapeToPoly({
      kind: 'polygon',
      cornerRadiusM: 1,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      holes: [
        [
          { x: 2, y: 2 },
          { x: 4, y: 2 },
          { x: 4, y: 4 },
          { x: 2, y: 4 },
        ],
      ],
    });
    expect(polyArea(rounded)).toBeLessThan(96);
  });
});

describe('catmullRom', () => {
  it('passes short lines through unchanged', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(catmullRom(line)).toEqual(line);
  });

  it('passes through every control point', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ];
    const out = catmullRom(pts);
    for (const p of pts) expect(out).toContainEqual(p);
    expect(out.length).toBeGreaterThan(pts.length);
  });
});
