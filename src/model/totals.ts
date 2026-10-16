/**
 * Plan-wide measurements (docs/05 PlanTotals). Per-object results are cached by object identity
 * (plans are immutable: an edited object is a new object), so recomputing totals after one edit
 * only re-measures that object plus the union of the cluster it sits in (geometry/union-area).
 */
import type { BBox, MultiPoly } from '../geometry/types.ts';
import { shapeToPoly } from '../geometry/flatten.ts';
import { bufferPolyline, polylineLength, roughPathSurface } from '../geometry/buffer.ts';
import { GeometryError } from '../geometry/clip.ts';
import { multiArea, multiPerimeter, bboxOfMulti, bboxesOverlap } from '../geometry/polygon.ts';
import { unionArea } from '../geometry/union-area.ts';
import { measureHabitat, type HabitatMeasure } from '../geometry/measure.ts';
import { sharedEdgeLength } from '../geometry/shared.ts';
import { getBarrier, getSpecies } from '../data/index.ts';
import { GROUND_TYPES } from './factory.ts';
import type { HabitatObject, MapObject, ObjectType, Plan } from './types.ts';

const footprintCache = new WeakMap<MapObject, MultiPoly | null>();

/** The ground an object covers, or null for icons, labels, measures and barrier lines. */
export function footprint(o: MapObject): MultiPoly | null {
  const cached = footprintCache.get(o);
  if (cached !== undefined) return cached;
  let fp: MultiPoly | null = null;
  if (o.type === 'path') {
    try {
      fp = bufferPolyline(o.line.points, o.widthM, o.cap, o.line.smooth);
    } catch (error) {
      if (!(error instanceof GeometryError)) throw error;
      // Never let one awkward path break the map: draw a plain version of it instead.
      fp = roughPathSurface(o.line.points, o.widthM);
    }
  } else if ('shape' in o && GROUND_TYPES.includes(o.type)) fp = [shapeToPoly(o.shape)];
  footprintCache.set(o, fp);
  return fp;
}

/** Area of an object's footprint (paved area for paths), or null if it covers no ground. */
export function objectArea(o: MapObject): number | null {
  const fp = footprint(o);
  return fp ? multiArea(fp) : null;
}

export function objectLength(o: MapObject): number | null {
  if (o.type === 'path' || o.type === 'barrier') return polylineLength(o.line.points);
  if (o.type === 'measure' && o.mode === 'distance') return polylineLength(o.points);
  return null;
}

const measureCache = new WeakMap<HabitatObject, { mapM2: number; m: HabitatMeasure }>();

export function habitatMeasure(h: HabitatObject, mapM2: number): HabitatMeasure {
  const hit = measureCache.get(h);
  if (hit && hit.mapM2 === mapM2) return hit.m;
  const m = measureHabitat({ kind: h.kind, shape: h.shape, zones: h.zones }, mapM2);
  measureCache.set(h, { mapM2, m });
  return m;
}

export interface CensusRow {
  key: string;
  name: string;
  males: number;
  females: number;
  juveniles: number;
}

export interface PlanTotals {
  mapM2: number;
  /** Union of everything that covers ground, clipped to the map. Overlaps count once. */
  plannedM2: number;
  habitatM2: number;
  freeM2: number;
  /** Sum of footprint areas by type (overlaps between types not removed). */
  areaByType: Partial<Record<ObjectType, number>>;
  countByType: Partial<Record<ObjectType, number>>;
  pathLengthByType: Record<string, number>;
  barrierLengthByType: Record<string, number>;
  barrierLengthByGrade: Record<string, number>;
  /** Habitat walls with shared walls counted once. */
  habitatWallM: number;
  census: CensusRow[];
  /** True if the union failed and plannedM2 is a sum instead (overlaps counted twice). */
  approximate: boolean;
}

/** Barrier grade of a habitat, or 0 if it has no barrier set. */
const gradeOf = (h: HabitatObject): number =>
  h.barrier ? (getBarrier(h.barrier.barrierId)?.grade ?? 0) : 0;

const totalsCache = new WeakMap<MapObject[], { w: number; h: number; t: PlanTotals }>();

export function planTotals(plan: Plan): PlanTotals {
  const { mapWidthM: w, mapHeightM: h } = plan.settings;
  const hit = totalsCache.get(plan.objects);
  if (hit && hit.w === w && hit.h === h) return hit.t;

  const mapM2 = w * h;
  const areaByType: Partial<Record<ObjectType, number>> = {};
  const countByType: Partial<Record<ObjectType, number>> = {};
  const pathLengthByType: Record<string, number> = {};
  const barrierLengthByType: Record<string, number> = {};
  const barrierLengthByGrade: Record<string, number> = {};
  const census = new Map<string, CensusRow>();
  const ground: MultiPoly[] = [];
  const habitatPolys: MultiPoly[] = [];
  const habitats: HabitatObject[] = [];

  for (const o of plan.objects) {
    countByType[o.type] = (countByType[o.type] ?? 0) + 1;
    const fp = footprint(o);
    if (fp) {
      ground.push(fp);
      areaByType[o.type] = (areaByType[o.type] ?? 0) + multiArea(fp);
    }
    if (o.type === 'path') {
      pathLengthByType[o.pathType] =
        (pathLengthByType[o.pathType] ?? 0) + polylineLength(o.line.points);
    } else if (o.type === 'barrier') {
      const len = polylineLength(o.line.points);
      const grade = String(getBarrier(o.barrierId)?.grade ?? 0);
      barrierLengthByType[o.barrierId] = (barrierLengthByType[o.barrierId] ?? 0) + len;
      barrierLengthByGrade[grade] = (barrierLengthByGrade[grade] ?? 0) + len;
    } else if (o.type === 'habitat') {
      habitats.push(o);
      habitatPolys.push(fp as MultiPoly);
      for (const a of o.animals) {
        const key = a.catalogId ?? a.speciesId ?? a.displayName.toLowerCase();
        const row = census.get(key) ?? {
          key,
          name: (a.catalogId && getSpecies(a.catalogId)?.commonName) || a.displayName,
          males: 0,
          females: 0,
          juveniles: 0,
        };
        row.males += a.males;
        row.females += a.females;
        row.juveniles += a.juveniles;
        census.set(key, row);
      }
    }
  }

  // Habitat walls: each habitat's perimeter, with walls shared between two habitats counted
  // once and assigned to the stronger (higher-grade) barrier.
  let habitatWallM = 0;
  const habitatBoxes = habitatPolys.map(bboxOfMulti);
  habitats.forEach((hab, i) => {
    const poly = habitatPolys[i] as MultiPoly;
    let own = multiPerimeter(poly);
    habitats.forEach((other, j) => {
      if (i === j) return;
      const otherPoly = habitatPolys[j] as MultiPoly;
      if (!bboxesOverlap(habitatBoxes[i] as BBox, habitatBoxes[j] as BBox)) return;
      const shared = sharedEdgeLength(poly[0]?.outer ?? [], otherPoly[0]?.outer ?? []);
      const keep =
        gradeOf(hab) > gradeOf(other) || (gradeOf(hab) === gradeOf(other) && hab.id < other.id);
      if (!keep) own -= shared;
    });
    habitatWallM += own;
    if (hab.barrier) {
      const grade = String(gradeOf(hab));
      barrierLengthByType[hab.barrier.barrierId] =
        (barrierLengthByType[hab.barrier.barrierId] ?? 0) + own;
      barrierLengthByGrade[grade] = (barrierLengthByGrade[grade] ?? 0) + own;
    }
  });

  let plannedM2: number;
  let habitatM2: number;
  let approximate = false;
  try {
    plannedM2 = unionArea(ground, { w, h });
    habitatM2 = unionArea(habitatPolys);
  } catch (error) {
    if (!(error instanceof GeometryError)) throw error;
    approximate = true;
    plannedM2 = Math.min(
      mapM2,
      ground.reduce((s, g) => s + multiArea(g), 0),
    );
    habitatM2 = habitatPolys.reduce((s, g) => s + multiArea(g), 0);
  }

  const t: PlanTotals = {
    mapM2,
    plannedM2,
    habitatM2,
    freeM2: Math.max(0, mapM2 - plannedM2),
    areaByType,
    countByType,
    pathLengthByType,
    barrierLengthByType,
    barrierLengthByGrade,
    habitatWallM,
    census: [...census.values()].sort((a, b) => a.name.localeCompare(b.name)),
    approximate,
  };
  totalsCache.set(plan.objects, { w, h, t });
  return t;
}
