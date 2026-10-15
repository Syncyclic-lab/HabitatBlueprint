/**
 * Derived habitat measurements (docs/03 §3.1 accounting rules, docs/05).
 * - Water = union(water, deep water) inside the habitat
 * - Deep water = union(deep water) inside the habitat
 * - Land = total − water
 * - Climbing is reported separately and does not reduce land
 * - Flying (aviaries) = flying zones inside the habitat, or the whole aviary if none are drawn
 */
import type { MultiPoly, Shape } from './types.ts';
import { multiArea, multiPerimeter } from './polygon.ts';
import { shapeToPoly } from './flatten.ts';
import { intersect, unionAll } from './clip.ts';

export type ZoneKind = 'water' | 'deepWater' | 'climbing' | 'shelter' | 'flying';
export type HabitatKind = 'habitat' | 'aviary' | 'aquarium' | 'exhibit';

export interface HabitatMeasure {
  totalM2: number;
  waterM2: number;
  deepWaterM2: number;
  landM2: number;
  climbingM2: number;
  shelterM2: number;
  flyingM2: number;
  perimeterM: number;
  pctOfMap: number;
}

export interface HabitatInput {
  kind: HabitatKind;
  shape: Shape;
  zones: readonly { kind: ZoneKind; shape: Shape }[];
}

/** Zones of the given kinds, merged and clipped to the habitat outline. */
export function zoneArea(
  outline: MultiPoly,
  zones: HabitatInput['zones'],
  kinds: ZoneKind[],
): MultiPoly {
  const parts = zones.filter((z) => kinds.includes(z.kind)).map((z) => [shapeToPoly(z.shape)]);
  return parts.length === 0 ? [] : intersect(unionAll(parts), outline);
}

export function measureHabitat(input: HabitatInput, mapAreaM2: number): HabitatMeasure {
  const outline: MultiPoly = [shapeToPoly(input.shape)];
  const totalM2 = multiArea(outline);
  const waterM2 = multiArea(zoneArea(outline, input.zones, ['water', 'deepWater']));
  const deepWaterM2 = multiArea(zoneArea(outline, input.zones, ['deepWater']));
  const climbingM2 = multiArea(zoneArea(outline, input.zones, ['climbing']));
  const shelterM2 = multiArea(zoneArea(outline, input.zones, ['shelter']));
  const hasFlyingZones = input.zones.some((z) => z.kind === 'flying');
  const flyingM2 =
    input.kind !== 'aviary'
      ? 0
      : hasFlyingZones
        ? multiArea(zoneArea(outline, input.zones, ['flying']))
        : totalM2;
  return {
    totalM2,
    waterM2,
    deepWaterM2,
    landM2: Math.max(0, totalM2 - waterM2),
    climbingM2,
    shelterM2,
    flyingM2,
    perimeterM: multiPerimeter(outline),
    pctOfMap: mapAreaM2 > 0 ? totalM2 / mapAreaM2 : 0,
  };
}
