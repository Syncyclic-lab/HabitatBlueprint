/** Ramer–Douglas–Peucker simplification, used to turn freehand strokes into editable polygons. */
import type { Vec2 } from './types.ts';
import { distanceToSegment } from './snap.ts';

export function simplify(points: readonly Vec2[], toleranceM: number): Vec2[] {
  if (points.length < 3) return [...points];
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    let maxD = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = distanceToSegment(points[i] as Vec2, points[start] as Vec2, points[end] as Vec2);
      if (d > maxD) {
        maxD = d;
        index = i;
      }
    }
    if (maxD > toleranceM) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
