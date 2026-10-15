import { describe, expect, it } from 'vitest';
import {
  clampToMap,
  distanceToSegment,
  nearestPointOnSegment,
  snapAngle,
  snapPoint,
  snapToGrid,
  type SnapOptions,
} from '../../../src/geometry/snap';
import { niceLength, scaleBar, visibleGridStep } from '../../../src/geometry/scale';
import { simplify } from '../../../src/geometry/simplify';
import type { Vec2 } from '../../../src/geometry/types';
import { DEFAULT_PRESET } from '../../../src/data/index';

const v = (x: number, y: number): Vec2 => ({ x, y });
const opts = (o: Partial<SnapOptions> = {}): SnapOptions => ({
  gridM: 5,
  vertices: true,
  edges: true,
  toleranceM: 1,
  ...o,
});

describe('snapping', () => {
  it('snaps to the grid (or not, for a zero step)', () => {
    expect(snapToGrid(v(12.4, 7.6), 5)).toEqual({ x: 10, y: 10 });
    expect(snapToGrid(v(12.4, 7.6), 0)).toEqual({ x: 12.4, y: 7.6 });
    expect(Object.is(snapToGrid(v(-0.4, 0), 5).x, 0)).toBe(true);
  });

  it('snaps angles to steps, keeping distance', () => {
    const p = snapAngle(v(0, 0), v(10, 1), 15);
    expect(p.x).toBeCloseTo(Math.hypot(10, 1), 9);
    expect(p.y).toBeCloseTo(0, 9);
    expect(snapAngle(v(0, 0), v(0, 0), 15)).toEqual(v(0, 0));
    expect(snapAngle(v(0, 0), v(3, 4), 0)).toEqual(v(3, 4));
  });

  it('finds the nearest point on a segment', () => {
    expect(nearestPointOnSegment(v(5, 5), v(0, 0), v(10, 0))).toEqual(v(5, 0));
    expect(nearestPointOnSegment(v(-5, 5), v(0, 0), v(10, 0))).toEqual(v(0, 0));
    expect(nearestPointOnSegment(v(5, 5), v(1, 1), v(1, 1))).toEqual(v(1, 1));
    expect(distanceToSegment(v(5, 5), v(0, 0), v(10, 0))).toBe(5);
  });

  const targets = {
    vertices: [v(0, 0), v(100, 100)],
    segments: [
      [v(20, 0), v(40, 0)],
      [v(20, 10), v(60, 10)],
    ] as [Vec2, Vec2][],
  };

  it('prefers vertices, then midpoints, then edges, then the grid', () => {
    expect(snapPoint(v(0.5, 0.5), targets, opts())).toEqual({ point: v(0, 0), kind: 'vertex' });
    expect(snapPoint(v(30.5, 0.5), targets, opts())).toEqual({ point: v(30, 0), kind: 'midpoint' });
    expect(snapPoint(v(24, 0.5), targets, opts())).toEqual({ point: v(24, 0), kind: 'edge' });
    expect(snapPoint(v(12, 13), targets, opts())).toEqual({ point: v(10, 15), kind: 'grid' });
    expect(snapPoint(v(12, 13), targets, opts({ gridM: 0 }))).toEqual({
      point: v(12, 13),
      kind: 'none',
    });
  });

  it('respects switched-off targets', () => {
    expect(
      snapPoint(v(0.5, 0.5), targets, opts({ vertices: false, edges: false, gridM: 0 })).kind,
    ).toBe('none');
  });

  it('picks the closer of two edges, but a midpoint beats a later edge', () => {
    const two = {
      vertices: [],
      segments: [
        [v(0, 0), v(100, 0)],
        [v(0, 1), v(100, 1)],
      ] as [Vec2, Vec2][],
    };
    expect(snapPoint(v(30, 0.9), two, opts())).toEqual({ point: v(30, 1), kind: 'edge' });
    const mid = {
      vertices: [],
      segments: [
        [v(0, 0), v(60, 0)],
        [v(0, 0.6), v(100, 0.6)],
      ] as [Vec2, Vec2][],
    };
    expect(snapPoint(v(30, 0.5), mid, opts())).toEqual({ point: v(30, 0), kind: 'midpoint' });
  });

  it('clamps to the map', () => {
    expect(clampToMap(v(-5, 2000), 1000, 1000)).toEqual(v(0, 1000));
  });
});

describe('scale bar and grid', () => {
  it('picks 1, 2 or 5 × 10ⁿ', () => {
    expect(niceLength(7)).toBe(5);
    expect(niceLength(3)).toBe(2);
    expect(niceLength(1.5)).toBe(1);
    expect(niceLength(0.7)).toBe(0.5);
  });

  it('reads correctly at every zoom level for the default map', () => {
    for (let zoom = 0.05; zoom <= 40; zoom *= 1.37) {
      const bar = scaleBar(zoom, 120);
      expect(bar.px).toBeLessThanOrEqual(120 + 1e-9);
      expect(bar.px).toBeGreaterThan(120 / 5 - 1e-9);
      expect(bar.px / zoom).toBeCloseTo(bar.meters, 9);
    }
    // At "fit", the whole map's width is 800 px: the bar must not exceed the map.
    const fit = 800 / DEFAULT_PRESET.widthM;
    expect(scaleBar(fit).meters).toBeLessThanOrEqual(DEFAULT_PRESET.widthM);
  });

  it('thins the grid so lines stay at least 6 px apart', () => {
    expect(visibleGridStep(5, 4)).toBe(5);
    expect(visibleGridStep(5, 0.5)).toBe(25);
    expect(visibleGridStep(1, 0.001)).toBeNull();
  });
});

describe('simplify', () => {
  it('leaves short inputs alone', () => {
    expect(simplify([v(0, 0), v(1, 1)], 0.5)).toEqual([v(0, 0), v(1, 1)]);
  });

  it('removes nearly straight points and keeps corners', () => {
    const pts = [v(0, 0), v(5, 0.1), v(10, 0), v(10, 10)];
    expect(simplify(pts, 0.5)).toEqual([v(0, 0), v(10, 0), v(10, 10)]);
  });

  it('keeps only the farthest point of a bump', () => {
    const pts = [v(0, 0), v(4, 3), v(5, 5), v(6, 3), v(10, 0)];
    expect(simplify(pts, 2)).toEqual([v(0, 0), v(5, 5), v(10, 0)]);
  });
});
