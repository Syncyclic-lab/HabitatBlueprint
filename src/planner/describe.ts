/**
 * Words for objects: type labels and the accessible names read by screen readers
 * (docs/08 "Map semantics"), e.g. "Elephant habitat, Habitat, 4,120 square meters,
 * in African grasslands, 1 male, 5 females".
 */
import { en } from '../i18n/en.ts';
import { getBarrier, getBuildingType, getPathType, getSpecies } from '../data/index.ts';
import { speakArea, speakLength, type Units } from '../lib/format.ts';
import type { AnimalEntry, MapObject, Plan } from '../model/types.ts';
import { objectArea, objectLength } from '../model/totals.ts';

const t = en.planner;

/** The object's kind in words: "Aviary", "Guest building", "Staff path", "Restrooms" … */
export function typeLabel(o: MapObject): string {
  switch (o.type) {
    case 'habitat':
      return t.habitatKinds[o.kind];
    case 'building':
      return getBuildingType(o.buildingType)?.label ?? t.types.building;
    case 'path':
      return getPathType(o.pathType)?.label ?? t.types.path;
    case 'water':
      return o.deep ? t.types.deepWater : t.types.water;
    case 'barrier':
      return getBarrier(o.barrierId)?.label ?? t.types.barrier;
    case 'icon':
      return (t.facilities as Record<string, string>)[o.iconId] ?? t.types.icon;
    default:
      return t.types[o.type];
  }
}

export function animalName(a: AnimalEntry): string {
  return (a.catalogId && getSpecies(a.catalogId)?.commonName) || a.displayName;
}

/** "1 male, 5 females" (juveniles only if any). */
export function sexCounts(a: AnimalEntry): string {
  const parts = [t.describe.males(a.males), t.describe.females(a.females)];
  if (a.juveniles > 0) parts.push(t.describe.juveniles(a.juveniles));
  return parts.join(', ');
}

export function animalsSummary(animals: readonly AnimalEntry[]): string {
  return animals.map((a) => `${sexCounts(a)} ${animalName(a)}`).join('; ');
}

/** Full accessible name for an object. */
export function describeObject(o: MapObject, plan: Plan, units: Units = plan.settings.units): string {
  const parts = [t.describe.object(o.name, typeLabel(o))];
  const area = o.type === 'path' ? null : objectArea(o);
  const length = objectLength(o);
  if (area !== null) parts.push(speakArea(area, units));
  if (length !== null) parts.push(t.describe.length(speakLength(length, units)));
  const themed = o.areaId ? plan.areas.find((a) => a.id === o.areaId) : undefined;
  if (themed) parts.push(t.describe.inArea(themed.name));
  if (o.type === 'habitat' && o.animals.length > 0) parts.push(animalsSummary(o.animals));
  if (o.locked) parts.push(t.describe.locked);
  if (o.hidden) parts.push(t.describe.hidden);
  return parts.join(', ');
}
