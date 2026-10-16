/**
 * Map colours and patterns for each object, from data/object-types.json and the plan's themed
 * areas. Patterns that carry meaning (aviary mesh, water, deep water, planting) are always on.
 */
import {
  DEFAULT_BIOME,
  getBiome,
  getBuildingType,
  getHabitatKind,
  getOtherType,
  getPathType,
  getSubZoneStyle,
  getSwatch,
} from '../../data/index.ts';
import type { PatternId } from '../../data/schemas.ts';
import { bestInk } from '../../lib/color.ts';
import type { MapObject, Plan, ZoneKind } from '../../model/types.ts';

export interface FillStyle {
  fill: string;
  /** Text and silhouette colour with ≥ 4.5:1 contrast against the fill. */
  ink: string;
  /** Pattern that carries meaning (always shown). */
  typePattern: PatternId;
  /** Themed-area pattern (subtle, can be turned off). */
  areaPattern: PatternId;
}

const MEANINGFUL: readonly PatternId[] = ['mesh', 'waves', 'waves-dense', 'leaf-dots'];

export function groundColor(plan: Plan): string {
  return getBiome(plan.settings.biomeId)?.ground ?? DEFAULT_BIOME.ground ?? '#5BAB4E';
}

export function objectFill(o: MapObject, plan: Plan): FillStyle | null {
  const area = o.areaId ? plan.areas.find((a) => a.id === o.areaId) : undefined;
  const swatch = area ? getSwatch(area.swatchId) : undefined;
  const areaPattern: PatternId = swatch && plan.settings.display.patterns ? swatch.pattern : 'none';
  switch (o.type) {
    case 'habitat': {
      const kind = getHabitatKind(o.kind);
      const fill = swatch && o.kind !== 'aquarium' ? swatch.fill : (kind?.defaultFill ?? '#DBB34D');
      const typePattern = kind?.pattern ?? 'none';
      return {
        fill,
        ink: bestInk(fill),
        typePattern: MEANINGFUL.includes(typePattern) ? typePattern : 'none',
        areaPattern,
      };
    }
    case 'building': {
      const b = getBuildingType(o.buildingType);
      const fill = b?.fill ?? '#A3ABAF';
      return { fill, ink: bestInk(fill), typePattern: b?.pattern ?? 'none', areaPattern: 'none' };
    }
    case 'plaza': {
      const fill = getOtherType('plaza')?.fill ?? '#CFCFBE';
      return { fill, ink: bestInk(fill), typePattern: 'none', areaPattern: 'none' };
    }
    case 'water': {
      const z = getSubZoneStyle(o.deep ? 'deepWater' : 'water');
      const fill = z?.fill ?? '#3FB7E0';
      return {
        fill,
        ink: bestInk(fill),
        typePattern: o.deep ? 'waves-dense' : 'waves',
        areaPattern: 'none',
      };
    }
    case 'planting': {
      const fill = getOtherType('planting')?.fill ?? '#3E8E41';
      return { fill, ink: bestInk(fill), typePattern: 'leaf-dots', areaPattern: 'none' };
    }
    case 'path': {
      const p = getPathType(o.pathType);
      const fill = p?.fill ?? '#E8ECED';
      return { fill, ink: bestInk(fill), typePattern: 'none', areaPattern: 'none' };
    }
    default:
      return null;
  }
}

const fillCache = new WeakMap<
  MapObject,
  { areas: Plan['areas']; display: Plan['settings']['display']; style: FillStyle | null }
>();

/**
 * objectFill, but returns the same object while the inputs are unchanged, so memoised map
 * shapes don't re-render when an unrelated part of the plan changes.
 */
export function cachedObjectFill(o: MapObject, plan: Plan): FillStyle | null {
  const hit = fillCache.get(o);
  if (hit && hit.areas === plan.areas && hit.display === plan.settings.display) return hit.style;
  const style = objectFill(o, plan);
  fillCache.set(o, { areas: plan.areas, display: plan.settings.display, style });
  return style;
}

const zoneFillCache = new Map<ZoneKind, FillStyle>();

export function zoneFill(kind: ZoneKind): FillStyle {
  const hit = zoneFillCache.get(kind);
  if (hit) return hit;
  const style = computeZoneFill(kind);
  zoneFillCache.set(kind, style);
  return style;
}

function computeZoneFill(kind: ZoneKind): FillStyle {
  const z = getSubZoneStyle(kind);
  const fill = z?.fill ?? '#3FB7E0';
  return { fill, ink: bestInk(fill), typePattern: z?.pattern ?? 'none', areaPattern: 'none' };
}

/** Draw order by type (docs/06 "Rendering"); array order breaks ties. */
export const LAYER_RANK: Record<MapObject['type'], number> = {
  planting: 0,
  water: 1,
  plaza: 2,
  path: 3,
  habitat: 4,
  building: 5,
  barrier: 6,
  icon: 7,
  label: 8,
  measure: 9,
};
