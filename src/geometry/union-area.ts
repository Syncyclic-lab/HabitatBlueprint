/**
 * The area of the union of many shapes, measured without one huge boolean operation.
 *
 * Shapes are grouped into clusters whose bounding boxes touch. Shapes in different clusters
 * can't overlap, so the union's area is the sum of each cluster's union area. A lone
 * single-polygon shape is measured directly; only real clusters go through the union. Each
 * cluster's area is cached by the identity of its members, so after an edit only the changed
 * shape's cluster is measured again. With `clip`, only area inside [0, w] × [0, h] counts.
 */
import type { BBox, MultiPoly } from './types.ts';
import { bboxOfMulti, bboxesOverlap, multiArea, unionBBox } from './polygon.ts';
import { clipToMap, unionAll } from './clip.ts';

export interface ClipRect {
  w: number;
  h: number;
}

interface ClusterResult {
  members: readonly MultiPoly[];
  clipKey: string;
  area: number;
}

const clusterCache = new WeakMap<MultiPoly, ClusterResult>();

const within = (b: BBox, clip: ClipRect | undefined): boolean =>
  !clip || (b.minX >= 0 && b.minY >= 0 && b.maxX <= clip.w && b.maxY <= clip.h);

const sameMembers = (a: readonly MultiPoly[], b: readonly MultiPoly[]): boolean =>
  a.length === b.length && a.every((m, i) => m === b[i]);

/**
 * Indexes of boxes grouped so that boxes which overlap or touch, directly or through others,
 * share a group. Sweep along x with union-find; groups list indexes in ascending order.
 */
export function overlapGroups(boxes: readonly BBox[]): number[][] {
  const parent = boxes.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root] as number;
    parent[i] = root;
    return root;
  };
  const order = boxes
    .map((_, i) => i)
    .sort((a, b) => (boxes[a] as BBox).minX - (boxes[b] as BBox).minX);
  let active: number[] = [];
  for (const i of order) {
    const box = boxes[i] as BBox;
    active = active.filter((j) => (boxes[j] as BBox).maxX >= box.minX);
    for (const j of active) {
      if (bboxesOverlap(box, boxes[j] as BBox)) parent[find(i)] = find(j);
    }
    active.push(i);
  }
  const groups = new Map<number, number[]>();
  boxes.forEach((_, i) => {
    const root = find(i);
    const group = groups.get(root);
    if (group) group.push(i);
    else groups.set(root, [i]);
  });
  return [...groups.values()];
}

/** Area of the union of `parts` (overlaps once), optionally clipped to the map rectangle. */
export function unionArea(parts: readonly MultiPoly[], clip?: ClipRect): number {
  const shapes = parts.filter((p) => p.some((poly) => poly.outer.length >= 3));
  const boxes = shapes.map(bboxOfMulti);
  const clipKey = clip ? `${clip.w}×${clip.h}` : '';
  let total = 0;
  for (const group of overlapGroups(boxes)) {
    const members = group.map((i) => shapes[i] as MultiPoly);
    const first = members[0] as MultiPoly;
    const box = group.map((i) => boxes[i] as BBox).reduce(unionBBox);
    if (members.length === 1 && first.length === 1 && within(box, clip)) {
      total += multiArea(first);
      continue;
    }
    const hit = clusterCache.get(first);
    if (hit && hit.clipKey === clipKey && sameMembers(hit.members, members)) {
      total += hit.area;
      continue;
    }
    const union = unionAll(members);
    const area = multiArea(clip && !within(box, clip) ? clipToMap(union, clip.w, clip.h) : union);
    clusterCache.set(first, { members, clipKey, area });
    total += area;
  }
  return total;
}
