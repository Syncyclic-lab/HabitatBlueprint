import { describe, expect, it } from 'vitest';
import type { BBox, MultiPoly } from '../../../src/geometry/types';
import { overlapGroups, unionArea } from '../../../src/geometry/union-area';
import { clipToMap, unionAll } from '../../../src/geometry/clip';
import { multiArea } from '../../../src/geometry/polygon';
import { ellipseRing } from '../../../src/geometry/flatten';

const sq = (x: number, y: number, s: number): MultiPoly => [
  {
    outer: [
      { x, y },
      { x: x + s, y },
      { x: x + s, y: y + s },
      { x, y: y + s },
    ],
    holes: [],
  },
];
const box = (minX: number, minY: number, maxX: number, maxY: number): BBox => ({
  minX,
  minY,
  maxX,
  maxY,
});

describe('overlapGroups', () => {
  it('groups overlapping and touching boxes, directly or through others', () => {
    const groups = overlapGroups([
      box(0, 0, 10, 10),
      box(50, 50, 60, 60),
      box(10, 0, 20, 10), // touches the first
      box(19, 5, 30, 8), // overlaps the third, so joins the first group too
      box(0, 40, 5, 45), // overlaps in x with the first but not in y
    ]);
    expect(groups.map((g) => [...g].sort())).toEqual(expect.arrayContaining([[0, 2, 3], [1], [4]]));
    expect(groups).toHaveLength(3);
  });

  it('handles no boxes', () => {
    expect(overlapGroups([])).toEqual([]);
  });
});

describe('unionArea', () => {
  it('sums shapes that are apart and counts overlaps once', () => {
    const a = sq(0, 0, 10);
    const b = sq(5, 0, 10); // overlaps a by 5 × 10
    const c = sq(100, 100, 10);
    expect(unionArea([a, b, c])).toBeCloseTo(150 + 100, 6);
  });

  it('matches one big union on a busy random scene', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const parts: MultiPoly[] = [];
    for (let i = 0; i < 60; i++) {
      const x = rand() * 300;
      const y = rand() * 300;
      parts.push(
        i % 3 === 0
          ? [{ outer: ellipseRing(x, y, 5 + rand() * 20, 5 + rand() * 10), holes: [] }]
          : sq(x, y, 5 + rand() * 25),
      );
    }
    expect(unionArea(parts)).toBeCloseTo(multiArea(unionAll(parts)), 4);
    expect(unionArea(parts, { w: 250, h: 250 })).toBeCloseTo(
      multiArea(clipToMap(unionAll(parts), 250, 250)),
      4,
    );
  });

  it('clips lone shapes and clusters that cross the map edge', () => {
    expect(unionArea([sq(-5, 0, 10)], { w: 100, h: 100 })).toBeCloseTo(50, 6);
    expect(unionArea([sq(95, 0, 10), sq(90, 0, 10)], { w: 100, h: 100 })).toBeCloseTo(100, 6);
    // A cluster wholly inside the map isn't clipped.
    expect(unionArea([sq(10, 10, 10), sq(15, 10, 10)], { w: 100, h: 100 })).toBeCloseTo(150, 6);
  });

  it('unions a lone shape made of several polygons (they may overlap)', () => {
    const two: MultiPoly = [...sq(0, 0, 10), ...sq(5, 0, 10)];
    expect(unionArea([two])).toBeCloseTo(150, 6);
  });

  it('ignores empty and degenerate shapes', () => {
    expect(
      unionArea([
        [],
        [
          {
            outer: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ],
            holes: [],
          },
        ],
        sq(0, 0, 2),
      ]),
    ).toBeCloseTo(4, 6);
  });

  it('reuses a cluster’s result until a member or the clip changes', () => {
    const a = sq(0, 0, 10);
    const b = sq(5, 5, 10);
    const first = unionArea([a, b], { w: 1000, h: 1000 });
    expect(unionArea([a, b], { w: 1000, h: 1000 })).toBe(first); // cached
    expect(unionArea([a, b])).toBeCloseTo(first, 9); // different clip key
    const b2 = sq(5, 5, 20);
    expect(unionArea([a, b2])).toBeCloseTo(100 + 400 - 25, 6); // a member changed
    expect(unionArea([a, b2, sq(8, 8, 1)])).toBeCloseTo(475, 6); // a member was added
  });
});
