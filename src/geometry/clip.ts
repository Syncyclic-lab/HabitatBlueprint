/**
 * Boolean operations (union, intersection, difference) via polygon-clipping (MIT).
 *
 * polygon-clipping can fail on points that almost, but not exactly, coincide (e.g. 6e-16 m from
 * a map edge). Inputs are therefore snapped to a 0.1 µm grid first, and if the library still
 * fails the operation is retried on coarser grids (0.1 mm, then 1 mm), which can't change any
 * area figure we display (rounded to 1 m²).
 */
import * as pcModule from 'polygon-clipping';
import type { MultiPoly, Poly, Ring } from './types.ts';
import { dedupeRing, normalizePoly } from './polygon.ts';

// polygon-clipping ships a default export at runtime but declares named exports in its types.
// Which branch runs depends on the bundler, so it's excluded from coverage.
/* v8 ignore next 2 */
const pc: typeof pcModule =
  (pcModule as unknown as { default?: typeof pcModule }).default ?? pcModule;

type PcRing = [number, number][];
type PcMulti = PcRing[][];

/** Snap grids tried in turn, as "points per meter" so rounding stays exact in binary. */
export const SNAP_GRIDS_PER_M = [1e7, 1e4, 1e3] as const;

export class GeometryError extends Error {
  override name = 'GeometryError';
}

const q = (n: number, perM: number): number => Math.round(n * perM) / perM + 0;

const ringToPc = (ring: Ring, perM: number): PcRing =>
  ring.map((p) => [q(p.x, perM), q(p.y, perM)]);

export const toPc = (mp: MultiPoly, perM: number = SNAP_GRIDS_PER_M[0]): PcMulti =>
  mp.map((poly) => [ringToPc(poly.outer, perM), ...poly.holes.map((h) => ringToPc(h, perM))]);

const ringFromPc = (ring: PcRing): Ring => dedupeRing(ring.map(([x, y]) => ({ x, y })));

export const fromPc = (multi: PcMulti): MultiPoly =>
  multi.map((rings) =>
    normalizePoly({
      outer: ringFromPc(rings[0] as PcRing),
      holes: rings.slice(1).map(ringFromPc),
    }),
  );

/** Runs `op` on each snap grid until one succeeds. */
export function withSnapRetries<T>(op: (perM: number) => T): T {
  let last: unknown;
  for (const perM of SNAP_GRIDS_PER_M) {
    try {
      return op(perM);
    } catch (error) {
      last = error;
    }
  }
  throw new GeometryError('These shapes could not be combined.', { cause: last });
}

const nonEmpty = (mp: MultiPoly): MultiPoly => mp.filter((p) => p.outer.length >= 3);

/** Union of any number of shapes. Overlaps count once. */
export function unionAll(parts: readonly MultiPoly[]): MultiPoly {
  const geoms = parts.map(nonEmpty).filter((g) => g.length > 0);
  if (geoms.length === 0) return [];
  return withSnapRetries((perM) => {
    const [first, ...rest] = geoms.map((g) => toPc(g, perM));
    return fromPc(pc.union(first as PcMulti, ...rest));
  });
}

export function intersect(a: MultiPoly, b: MultiPoly): MultiPoly {
  const ga = nonEmpty(a);
  const gb = nonEmpty(b);
  if (ga.length === 0 || gb.length === 0) return [];
  return withSnapRetries((perM) => fromPc(pc.intersection(toPc(ga, perM), toPc(gb, perM))));
}

export function subtract(a: MultiPoly, b: MultiPoly): MultiPoly {
  const ga = nonEmpty(a);
  const gb = nonEmpty(b);
  if (ga.length === 0) return [];
  if (gb.length === 0) return ga;
  return withSnapRetries((perM) => fromPc(pc.difference(toPc(ga, perM), toPc(gb, perM))));
}

export const polyToMulti = (poly: Poly): MultiPoly => [poly];

/** The map's buildable rectangle as a polygon. */
export const mapRect = (widthM: number, heightM: number): MultiPoly => [
  {
    outer: [
      { x: 0, y: 0 },
      { x: widthM, y: 0 },
      { x: widthM, y: heightM },
      { x: 0, y: heightM },
    ],
    holes: [],
  },
];

/** Clips shapes to the map boundary. */
export const clipToMap = (mp: MultiPoly, widthM: number, heightM: number): MultiPoly =>
  intersect(mp, mapRect(widthM, heightM));
