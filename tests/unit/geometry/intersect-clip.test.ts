import { describe, expect, it } from 'vitest';
import {
  checkRing,
  findSelfIntersection,
  segmentsIntersect,
} from '../../../src/geometry/intersect';
import {
  GeometryError,
  SNAP_GRIDS_PER_M,
  clipToMap,
  fromPc,
  intersect,
  mapRect,
  polyToMulti,
  subtract,
  toPc,
  unionAll,
  withSnapRetries,
} from '../../../src/geometry/clip';
import {
  bufferPolyline,
  pathPoints,
  polylineLength,
  roughPathSurface,
} from '../../../src/geometry/buffer';
import { multiArea } from '../../../src/geometry/polygon';
import { ellipseRing } from '../../../src/geometry/flatten';
import type { MultiPoly, Poly, Vec2 } from '../../../src/geometry/types';

const v = (x: number, y: number): Vec2 => ({ x, y });
const sq = (x: number, y: number, s: number): Poly => ({
  outer: [v(x, y), v(x + s, y), v(x + s, y + s), v(x, y + s)],
  holes: [],
});

describe('segmentsIntersect', () => {
  it('detects crossings, touching and collinear overlap', () => {
    expect(segmentsIntersect(v(0, 0), v(10, 10), v(0, 10), v(10, 0))).toBe(true);
    expect(segmentsIntersect(v(0, 0), v(10, 0), v(0, 1), v(10, 1))).toBe(false);
    expect(segmentsIntersect(v(0, 0), v(10, 0), v(5, 0), v(15, 0))).toBe(true);
    expect(segmentsIntersect(v(0, 0), v(10, 0), v(10, 0), v(10, 5))).toBe(true);
    expect(segmentsIntersect(v(0, 0), v(10, 0), v(11, 0), v(15, 0))).toBe(false);
  });

  it('covers each collinear end case', () => {
    // c on ab
    expect(segmentsIntersect(v(0, 0), v(10, 0), v(5, 0), v(5, 5))).toBe(true);
    // d on ab
    expect(segmentsIntersect(v(0, 0), v(10, 0), v(5, 5), v(5, 0))).toBe(true);
    // a on cd
    expect(segmentsIntersect(v(5, 0), v(5, 5), v(0, 0), v(10, 0))).toBe(true);
    // b on cd
    expect(segmentsIntersect(v(5, 5), v(5, 0), v(0, 0), v(10, 0))).toBe(true);
    // collinear but disjoint on the far side
    expect(segmentsIntersect(v(0, 0), v(1, 1), v(2, 2), v(3, 3))).toBe(false);
  });
});

describe('findSelfIntersection and checkRing', () => {
  it('finds crossing edges in a bow-tie', () => {
    expect(findSelfIntersection([v(0, 0), v(10, 10), v(10, 0), v(0, 10)])).toEqual([0, 2]);
  });

  it('returns null for simple rings and tiny inputs', () => {
    expect(findSelfIntersection(sq(0, 0, 10).outer)).toBeNull();
    expect(findSelfIntersection([v(0, 0), v(1, 1)])).toBeNull();
    expect(findSelfIntersection([v(0, 0), v(10, 0), v(20, 0)])).toBeNull();
  });

  it('treats straight-through points as fine and fold-backs as crossings', () => {
    expect(findSelfIntersection([v(0, 0), v(5, 0), v(10, 0), v(10, 10), v(0, 10)])).toBeNull();
    expect(findSelfIntersection([v(0, 0), v(10, 0), v(5, 0), v(5, 10)])).not.toBeNull();
  });

  it('explains why a ring is rejected', () => {
    expect(checkRing([v(0, 0), v(1, 1)])).toEqual({ ok: false, problem: 'tooFewPoints' });
    expect(checkRing([v(0, 0), v(5, 0), v(10, 0)])).toEqual({ ok: false, problem: 'noArea' });
    expect(checkRing(sq(0, 0, 10).outer)).toEqual({ ok: true });
  });
});

describe('boolean operations', () => {
  const a: MultiPoly = [sq(0, 0, 10)];
  const b: MultiPoly = [sq(5, 0, 10)];

  it('unions, intersects and subtracts', () => {
    expect(multiArea(unionAll([a, b]))).toBeCloseTo(150, 9);
    expect(multiArea(intersect(a, b))).toBeCloseTo(50, 9);
    expect(multiArea(subtract(a, b))).toBeCloseTo(50, 9);
  });

  it('handles empty inputs', () => {
    expect(unionAll([])).toEqual([]);
    expect(unionAll([[], a])).toHaveLength(1);
    expect(unionAll([[{ outer: [v(0, 0), v(1, 1)], holes: [] }]])).toEqual([]);
    expect(intersect([], a)).toEqual([]);
    expect(intersect(a, [])).toEqual([]);
    expect(subtract([], a)).toEqual([]);
    expect(subtract(a, [])).toEqual(a);
  });

  it('keeps holes through a round trip', () => {
    const withHole: MultiPoly = [{ outer: sq(0, 0, 20).outer, holes: [sq(5, 5, 5).outer] }];
    expect(multiArea(fromPc(toPc(withHole)))).toBeCloseTo(375, 9);
    expect(multiArea(subtract([sq(0, 0, 20)], [sq(5, 5, 5)]))).toBeCloseTo(375, 9);
  });

  it('survives near-coincident points (found by property testing)', () => {
    const a: MultiPoly = [
      {
        outer: [
          v(1, 0),
          v(4.683327420131402e-16, 7.6484541067548895),
          v(-25.83291003264063, 3.1636190584134896e-15),
          v(-1.8369701987210297e-16, -1),
        ],
        holes: [],
      },
    ];
    expect(() => clipToMap(a, 1000, 1000)).not.toThrow();
  });

  it('retries on a coarser grid, and reports failure if every grid fails', () => {
    let calls = 0;
    expect(
      withSnapRetries((perM) => {
        calls++;
        if (perM === SNAP_GRIDS_PER_M[0]) throw new Error('library failure');
        return perM;
      }),
    ).toBe(SNAP_GRIDS_PER_M[1]);
    expect(calls).toBe(2);
    expect(() =>
      withSnapRetries(() => {
        throw new Error('always');
      }),
    ).toThrow(GeometryError);
  });

  it('clips to the map', () => {
    expect(multiArea(mapRect(100, 50))).toBe(5000);
    expect(multiArea(clipToMap([sq(-5, -5, 10)], 100, 100))).toBeCloseTo(25, 9);
    expect(polyToMulti(sq(0, 0, 1))).toHaveLength(1);
  });
});

describe('paths', () => {
  it('drops repeated points and can smooth', () => {
    expect(pathPoints([v(0, 0), v(0, 0), v(10, 0)], false)).toEqual([v(0, 0), v(10, 0)]);
    expect(pathPoints([v(0, 0), v(10, 5), v(20, 0)], true).length).toBeGreaterThan(3);
  });

  it('measures length', () => {
    expect(polylineLength([v(0, 0), v(3, 4), v(3, 10)])).toBe(11);
    expect(polylineLength([v(0, 0)])).toBe(0);
  });

  it('returns nothing for fewer than two points or no width', () => {
    expect(bufferPolyline([v(0, 0)], 4, 'round')).toEqual([]);
    expect(bufferPolyline([v(0, 0), v(10, 0)], 0, 'round')).toEqual([]);
  });

  it('counts a bend once with a round join', () => {
    const area = multiArea(bufferPolyline([v(0, 0), v(50, 0), v(50, 50)], 4, 'flat'));
    // Two 50 × 4 strips meeting at a right angle, plus the outside of the round join.
    expect(area).toBeGreaterThan(50 * 4 * 2 - 4 * 4);
    expect(area).toBeLessThan(50 * 4 * 2 + 4 * 4);
  });

  it('smooths a path when asked', () => {
    const area = multiArea(bufferPolyline([v(0, 0), v(50, 20), v(100, 0)], 4, 'round', true));
    expect(area).toBeGreaterThan(400);
  });

  /** The surface built the slow, obviously-correct way: a full circle at every vertex. */
  function reference(points: Vec2[], widthM: number): number {
    const r = widthM / 2;
    const parts: MultiPoly[] = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1] as Vec2;
      const b = points[i] as Vec2;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n = v((-(b.y - a.y) * r) / len, ((b.x - a.x) * r) / len);
      parts.push([
        {
          outer: [
            v(a.x + n.x, a.y + n.y),
            v(b.x + n.x, b.y + n.y),
            v(b.x - n.x, b.y - n.y),
            v(a.x - n.x, a.y - n.y),
          ],
          holes: [],
        },
      ]);
    }
    for (const p of points.slice(1, -1))
      parts.push([{ outer: ellipseRing(p.x, p.y, r, r), holes: [] }]);
    return multiArea(unionAll(parts));
  }

  it('adds nothing at a straight-through vertex', () => {
    expect(multiArea(bufferPolyline([v(0, 0), v(50, 0), v(100, 0)], 4, 'flat'))).toBeCloseTo(
      400,
      6,
    );
  });

  it.each([
    ['left', [v(0, 0), v(40, 0), v(70, 30)]],
    ['right', [v(0, 0), v(40, 0), v(70, -30)]],
    ['sharp', [v(0, 0), v(40, 0), v(5, 8)]],
    ['zigzag', [v(0, 0), v(20, 10), v(40, 0), v(60, 12), v(80, 0)]],
  ])('a %s turn covers the same ground as full round joins', (_name, pts) => {
    expect(multiArea(bufferPolyline(pts, 6, 'flat'))).toBeCloseTo(reference(pts, 6), 1);
  });

  it('uses full round joins where segments are shorter than half the width', () => {
    const pts = [v(0, 0), v(2, 0), v(3, 1.5), v(3.5, 4)];
    expect(multiArea(bufferPolyline(pts, 8, 'flat'))).toBeCloseTo(reference(pts, 8), 1);
  });

  it('treats a path that ends where it started as a loop (a join there, no caps)', () => {
    const square = [v(0, 0), v(40, 0), v(40, 40), v(0, 40), v(0, 0)];
    // Outer 44 × 44 square with four round corners (r = 2), minus the inner 36 × 36 square.
    const expected = 44 * 44 - (4 - Math.PI) * 4 - 36 * 36;
    expect(multiArea(bufferPolyline(square, 4, 'flat'))).toBeCloseTo(expected, 1);
    expect(multiArea(bufferPolyline(square, 4, 'round'))).toBeCloseTo(expected, 1);
    // Starting halfway along a side: the loop closes on a straight line, so no join is needed.
    const midSide = [v(20, 0), v(40, 0), v(40, 40), v(0, 40), v(0, 0), v(20, 0)];
    expect(multiArea(bufferPolyline(midSide, 4, 'flat'))).toBeCloseTo(expected, 1);
  });

  // An oval drawn with 24 points (from tests/fixtures/crystal-ridge-like). polygon-clipping's
  // sweep fails on the one-shot union of this smoothed path, so it exercises the staged merge.
  const oval = [
    v(800, 500),
    v(789.78, 562.12),
    v(759.81, 620),
    v(712.13, 669.71),
    v(650, 707.85),
    v(577.65, 731.82),
    v(500, 740),
    v(422.35, 731.82),
    v(350, 707.85),
    v(287.87, 669.71),
    v(240.19, 620),
    v(210.22, 562.12),
    v(200, 500),
    v(210.22, 437.88),
    v(240.19, 380),
    v(287.87, 330.29),
    v(350, 292.15),
    v(422.35, 268.18),
    v(500, 260),
    v(577.65, 268.18),
    v(650, 292.15),
    v(712.13, 330.29),
    v(759.81, 380),
    v(789.78, 437.88),
  ];

  it('gets past polygon-clipping failures on long smooth paths', () => {
    // A smooth curve far wider than the path: area = length × width + the two half-disc caps.
    const length = polylineLength(pathPoints(oval, true));
    expect(multiArea(bufferPolyline(oval, 6, 'round', true))).toBeCloseTo(
      length * 6 + Math.PI * 9,
      0,
    );
  });

  it('closes the same oval into a loop', () => {
    const loop = [...oval, oval[0] as Vec2];
    const length = polylineLength(pathPoints(loop, true));
    expect(multiArea(bufferPolyline(loop, 6, 'round', true))).toBeCloseTo(length * 6, 0);
  });

  it('has a rough, unmerged surface as a last resort', () => {
    const rough = roughPathSurface([v(0, 0), v(10, 0), v(10, 0), v(10, 10)], 2);
    expect(rough).toHaveLength(2); // the repeated point is dropped
    expect(multiArea(rough)).toBeCloseTo(40, 6);
    expect(roughPathSurface([v(0, 0), v(10, 0)], 0)).toEqual([]);
  });

  it('a smooth curve stays within a square metre of the reference', () => {
    const pts = pathPoints([v(0, 0), v(30, 25), v(60, 0), v(90, 30)], true);
    expect(Math.abs(multiArea(bufferPolyline(pts, 5, 'flat')) - reference(pts, 5))).toBeLessThan(1);
  });
});
