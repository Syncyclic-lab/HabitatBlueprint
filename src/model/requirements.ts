/**
 * The species requirement check (docs/03 §4.6). For each animal group in a habitat:
 *   required = (base + max(0, count − includedInBase) × perExtra) × (1 + buffer)
 * per space type, compared with what the habitat has. Each species is checked on its own.
 * This is a planning assumption; players should confirm against the in-game Zoopedia (Q7).
 */
import type { HabitatMeasure } from '../geometry/measure.ts';
import type { AnimalEntry, AreaRequirement, HabitatObject, SpeciesRequirement } from './types.ts';

export type SpaceType = 'land' | 'water' | 'deepWater' | 'climbing' | 'flying';
export const SPACE_TYPES: readonly SpaceType[] = [
  'land',
  'water',
  'deepWater',
  'climbing',
  'flying',
];

export function requiredArea(
  req: AreaRequirement | null,
  count: number,
  includedInBase: number,
  buffer: number,
): number | null {
  if (!req) return null;
  return (req.baseM2 + Math.max(0, count - includedInBase) * req.perExtraM2) * (1 + buffer);
}

export const animalCount = (a: AnimalEntry): number => a.males + a.females + a.juveniles;

export type FitStatus = 'fits' | 'short' | 'noData' | 'noAnimals';

export interface SpaceRow {
  space: SpaceType;
  requiredM2: number;
  availableM2: number;
  shortM2: number;
}

export interface SpeciesCheck {
  animal: AnimalEntry;
  species: SpeciesRequirement | null;
  rows: SpaceRow[];
  status: Exclude<FitStatus, 'noAnimals'>;
}

export interface HabitatCheck {
  status: FitStatus;
  /** Largest shortfall across species and spaces (m²), 0 if everything fits. */
  shortM2: number;
  species: SpeciesCheck[];
}

const available = (m: HabitatMeasure, space: SpaceType): number =>
  ({
    land: m.landM2,
    water: m.waterM2,
    deepWater: m.deepWaterM2,
    climbing: m.climbingM2,
    flying: m.flyingM2,
  })[space];

/** The library entry for an animal: by direct link, else by catalog species. */
export function findRequirement(
  animal: AnimalEntry,
  library: readonly SpeciesRequirement[],
): SpeciesRequirement | null {
  return (
    library.find((s) => animal.speciesId !== undefined && s.id === animal.speciesId) ??
    library.find((s) => animal.catalogId !== undefined && s.catalogId === animal.catalogId) ??
    null
  );
}

export function checkHabitat(
  habitat: HabitatObject,
  measure: HabitatMeasure,
  library: readonly SpeciesRequirement[],
  bufferPct: number,
): HabitatCheck {
  if (habitat.animals.length === 0) return { status: 'noAnimals', shortM2: 0, species: [] };
  const buffer = bufferPct / 100;
  const species = habitat.animals.map((animal): SpeciesCheck => {
    const req = findRequirement(animal, library);
    if (!req) return { animal, species: null, rows: [], status: 'noData' };
    const rows: SpaceRow[] = [];
    for (const space of SPACE_TYPES) {
      const need = requiredArea(
        req.requirements[space],
        animalCount(animal),
        req.includedInBase,
        buffer,
      );
      if (need === null) continue;
      const have = available(measure, space);
      rows.push({ space, requiredM2: need, availableM2: have, shortM2: Math.max(0, need - have) });
    }
    if (rows.length === 0) return { animal, species: req, rows, status: 'noData' };
    return {
      animal,
      species: req,
      rows,
      status: rows.some((r) => r.shortM2 > 0) ? 'short' : 'fits',
    };
  });
  const shortM2 = Math.max(0, ...species.flatMap((s) => s.rows.map((r) => r.shortM2)));
  const status: FitStatus = species.some((s) => s.status === 'short')
    ? 'short'
    : species.some((s) => s.status === 'fits')
      ? 'fits'
      : 'noData';
  return { status, shortM2, species };
}
