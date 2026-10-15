/**
 * Parsed, typed access to the files in /data. Parsing happens once at import time, so a bad
 * data file throws during the build (and in unit tests) rather than in a user's browser.
 */
import mapsJson from '../../data/maps.json';
import biomesJson from '../../data/biomes.json';
import objectTypesJson from '../../data/object-types.json';
import barriersJson from '../../data/barriers.json';
import speciesJson from '../../data/species.json';
import {
  barriersFileSchema,
  biomesFileSchema,
  mapsFileSchema,
  objectTypesFileSchema,
  speciesFileSchema,
  type Biome,
  type MapPreset,
  type SpeciesEntry,
} from './schemas.ts';

export const MAPS = mapsFileSchema.parse(mapsJson);
export const BIOMES = biomesFileSchema.parse(biomesJson);
export const OBJECT_TYPES = objectTypesFileSchema.parse(objectTypesJson);
export const BARRIERS = barriersFileSchema.parse(barriersJson);
export const SPECIES = speciesFileSchema.parse(speciesJson);

/** Biomes that can be a map's ground, in file order. */
export const MAP_BIOMES: readonly Biome[] = BIOMES.biomes.filter((b) => b.mapGround);

export const DEFAULT_BIOME: Biome = BIOMES.biomes.find((b) => b.isDefault) as Biome;

export const DEFAULT_PRESET: MapPreset = MAPS.presets.find(
  (p) => p.id === MAPS.defaultPresetId,
) as MapPreset;

export function getPreset(id: string): MapPreset | undefined {
  return MAPS.presets.find((p) => p.id === id);
}

export function getBiome(id: string): Biome | undefined {
  return BIOMES.biomes.find((b) => b.id === id);
}

const speciesById = new Map<string, SpeciesEntry>(SPECIES.species.map((s) => [s.id, s]));

export function getSpecies(id: string): SpeciesEntry | undefined {
  return speciesById.get(id);
}

export function getBuildingType(id: string) {
  return OBJECT_TYPES.buildingTypes.find((b) => b.id === id);
}

export function getPathType(id: string) {
  return OBJECT_TYPES.pathTypes.find((p) => p.id === id);
}

export function getSwatch(id: string) {
  return OBJECT_TYPES.areaPalette.swatches.find((s) => s.id === id);
}

export function getHabitatKind(id: string) {
  return OBJECT_TYPES.habitatKinds.find((k) => k.id === id);
}

export function getSubZoneStyle(id: string) {
  return OBJECT_TYPES.subZones.find((z) => z.id === id);
}

export function getOtherType(id: string) {
  return OBJECT_TYPES.otherTypes.find((o) => o.id === id);
}

export function getBarrier(id: string) {
  return BARRIERS.barriers.find((b) => b.id === id);
}
