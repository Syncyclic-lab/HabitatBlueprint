/**
 * Property-based tests (docs/06 "Geometry module rules"): area is translation- and
 * rotation-invariant, union area ≤ sum of areas, clipping never adds area, and resize-to-area
 * hits the target within 0.01 m².
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Shape } from '../../../src/geometry/types';
import { resizeToArea, shapeArea } from '../../../src/geometry/resize';
import { rotateShape, translateShape } from '../../../src/geometry/transform';
import { shapeToPoly } from '../../../src/geometry/flatten';
import { clipToMap, intersect, unionAll } from '../../../src/geometry/clip';
import { multiArea } from '../../../src/geometry/polygon';

/** Snapping inputs to a 0.1 µm grid can move an area by a few millionths of a m². */
const SNAP_SLACK_M2 = 1e-4;

const coord = fc.double({ min: 0, max: 900, noNaN: true });
const size = fc.double({ min: 1, max: 200, noNaN: true });
const angle = fc.double({ min: -360, max: 360, noNaN: true });

const rectArb: fc.Arbitrary<Shape> = fc.record({
  kind: fc.constant('rect' as const),
  x: coord,
  y: coord,
  w: size,
  h: size,
  rotationDeg: angle,
});

const ellipseArb: fc.Arbitrary<Shape> = fc.record({
  kind: fc.constant('ellipse' as const),
  cx: coord,
  cy: coord,
  rx: size,
  ry: size,
  rotationDeg: angle,
});

/** Star-shaped polygons (always simple): points at sorted angles around a centre. */
const polygonArb: fc.Arbitrary<Shape> = fc
  .tuple(
    coord,
    coord,
    fc.array(fc.tuple(fc.double({ min: 0, max: 1, noNaN: true }), size), {
      minLength: 3,
      maxLength: 12,
    }),
  )
  .map(([cx, cy, spokes]) => {
    const sorted = [...spokes].sort((a, b) => a[0] - b[0]);
    return {
      kind: 'polygon' as const,
      points: sorted.map(([t, r], i) => {
        const a = ((t + i) / sorted.length) * 2 * Math.PI;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      }),
    };
  })
  .filter((s) => shapeArea(s) > 1);

const shapeArb = fc.oneof(rectArb, ellipseArb, polygonArb);

describe('geometry properties', () => {
  it('area is unchanged by moving', () => {
    fc.assert(
      fc.property(shapeArb, coord, coord, (s, dx, dy) => {
        expect(shapeArea(translateShape(s, dx, dy))).toBeCloseTo(shapeArea(s), 4);
      }),
    );
  });

  it('area is unchanged by rotating', () => {
    fc.assert(
      fc.property(shapeArb, angle, (s, deg) => {
        expect(shapeArea(rotateShape(s, deg))).toBeCloseTo(shapeArea(s), 4);
      }),
    );
  });

  it('union area never exceeds the sum of the parts', () => {
    fc.assert(
      fc.property(shapeArb, shapeArb, (a, b) => {
        const pa = [shapeToPoly(a)];
        const pb = [shapeToPoly(b)];
        const u = multiArea(unionAll([pa, pb]));
        expect(u).toBeLessThanOrEqual(multiArea(pa) + multiArea(pb) + SNAP_SLACK_M2);
        expect(u).toBeGreaterThanOrEqual(Math.max(multiArea(pa), multiArea(pb)) - SNAP_SLACK_M2);
      }),
      { numRuns: 60 },
    );
  });

  it('clipping never adds area', () => {
    fc.assert(
      fc.property(shapeArb, shapeArb, (a, b) => {
        const pa = [shapeToPoly(a)];
        expect(multiArea(intersect(pa, [shapeToPoly(b)]))).toBeLessThanOrEqual(
          multiArea(pa) + SNAP_SLACK_M2,
        );
        expect(multiArea(clipToMap(pa, 1000, 1000))).toBeLessThanOrEqual(
          multiArea(pa) + SNAP_SLACK_M2,
        );
      }),
      { numRuns: 60 },
    );
  });

  it('resize-to-area hits the target within 0.01 m²', () => {
    fc.assert(
      fc.property(shapeArb, fc.double({ min: 10, max: 50_000, noNaN: true }), (s, target) => {
        expect(Math.abs(shapeArea(resizeToArea(s, target)) - target)).toBeLessThan(0.01);
      }),
    );
  });
});
