import { describe, expect, it } from 'vitest';
import { collinearOverlap, sharedEdgeLength } from '../../../src/geometry/shared';
import type { Ring, Vec2 } from '../../../src/geometry/types';

const v = (x: number, y: number): Vec2 => ({ x, y });
const sq = (x: number, y: number, w: number, h: number): Ring => [v(x, y), v(x + w, y), v(x + w, y + h), v(x, y + h)];

describe('collinearOverlap', () => {
  it('measures overlap of collinear segments in either direction', () => {
    expect(collinearOverlap(v(0, 0), v(10, 0), v(5, 0), v(15, 0))).toBe(5);
    expect(collinearOverlap(v(0, 0), v(10, 0), v(15, 0), v(-5, 0))).toBe(10);
  });

  it('returns 0 for parallel-but-apart, disjoint or degenerate segments', () => {
    expect(collinearOverlap(v(0, 0), v(10, 0), v(0, 1), v(10, 1))).toBe(0);
    expect(collinearOverlap(v(0, 0), v(10, 0), v(0, 0), v(10, 1))).toBe(0);
    expect(collinearOverlap(v(0, 0), v(10, 0), v(11, 0), v(20, 0))).toBe(0);
    expect(collinearOverlap(v(0, 0), v(0, 0), v(0, 0), v(1, 0))).toBe(0);
    expect(collinearOverlap(v(0, 0), v(1, 0), v(2, 0), v(2, 0))).toBe(0);
  });
});

describe('sharedEdgeLength', () => {
  it('finds a full shared wall between neighbouring habitats', () => {
    expect(sharedEdgeLength(sq(0, 0, 40, 30), sq(40, 0, 20, 30))).toBeCloseTo(30, 9);
  });

  it('finds a partial shared wall', () => {
    expect(sharedEdgeLength(sq(0, 0, 40, 30), sq(40, 10, 20, 50))).toBeCloseTo(20, 9);
  });

  it('is zero for shapes that only touch at a corner or are apart', () => {
    expect(sharedEdgeLength(sq(0, 0, 10, 10), sq(10, 10, 10, 10))).toBe(0);
    expect(sharedEdgeLength(sq(0, 0, 10, 10), sq(50, 50, 10, 10))).toBe(0);
  });
});
