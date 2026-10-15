import { describe, expect, it } from 'vitest';
import {
  BARRIERS,
  BIOMES,
  DEFAULT_BIOME,
  DEFAULT_PRESET,
  MAPS,
  MAP_BIOMES,
  OBJECT_TYPES,
  SPECIES,
  getSpecies,
} from '../../src/data/index';
import {
  barriersFileSchema,
  biomesFileSchema,
  mapsFileSchema,
  speciesFileSchema,
} from '../../src/data/schemas';
import { bestInk, contrastRatio } from '../../src/lib/color';
import mapsJson from '../../data/maps.json';
import speciesJson from '../../data/species.json';

describe('data files', () => {
  it('parse against their schemas', () => {
    expect(MAPS.presets.length).toBeGreaterThan(0);
    expect(BIOMES.biomes.length).toBe(12);
    expect(BARRIERS.barriers.length).toBe(16);
    expect(OBJECT_TYPES.habitatKinds.map((k) => k.id)).toEqual([
      'habitat',
      'aviary',
      'aquarium',
      'exhibit',
    ]);
  });

  it('every game fact carries a source and a verified flag', () => {
    for (const preset of MAPS.presets) {
      expect(preset.source.length).toBeGreaterThan(0);
      expect(typeof preset.verified).toBe('boolean');
    }
    for (const biome of BIOMES.biomes) expect(typeof biome.verified).toBe('boolean');
    expect(BIOMES.source.length).toBeGreaterThan(0);
    expect(BARRIERS.source.url).toMatch(/^https:/);
    expect(typeof BARRIERS.verified).toBe('boolean');
    expect(SPECIES.source.url).toMatch(/^https:/);
    expect(typeof SPECIES.verified).toBe('boolean');
  });

  it('keeps the map size unverified until someone checks it in-game', () => {
    // If this fails, someone verified the size: update docs/04 §1 and the Help page too.
    expect(DEFAULT_PRESET.verified).toBe(false);
  });

  it('rejects a malformed maps file', () => {
    const bad = structuredClone(mapsJson) as { presets: Array<{ widthM: number }> };
    const first = bad.presets[0];
    if (first) first.widthM = -5;
    expect(mapsFileSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a verified preset without verification details', () => {
    const bad = structuredClone(mapsJson) as { presets: Array<{ verified: boolean }> };
    const first = bad.presets[0];
    if (first) first.verified = true;
    expect(mapsFileSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown fields (strict objects)', () => {
    const bad = { ...structuredClone(speciesJson), extra: true };
    expect(speciesFileSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a barrier grade outside the grade range', () => {
    const bad = structuredClone(BARRIERS) as { barriers: Array<{ grade: number }> };
    const first = bad.barriers[0];
    if (first) first.grade = 9;
    expect(barriersFileSchema.safeParse({ ...bad, $comment: '' }).success).toBe(false);
  });

  it('has exactly one default biome and every map biome has colours', () => {
    expect(DEFAULT_BIOME.id).toBe('grassland');
    for (const b of MAP_BIOMES) {
      expect(b.ground).toBeDefined();
      expect(b.pathFill).toBeDefined();
    }
    const twoDefaults = structuredClone(BIOMES);
    for (const b of twoDefaults.biomes) b.isDefault = true;
    expect(biomesFileSchema.safeParse(twoDefaults).success).toBe(false);
  });
});

describe('species list', () => {
  it('lists all 136 Planet Zoo 2 species from the official Zoopedia', () => {
    expect(SPECIES.species).toHaveLength(136);
    expect(SPECIES.source.kind).toBe('official');
  });

  it('has 6 Deluxe Edition species', () => {
    const deluxe = SPECIES.species.filter((s) => s.edition === 'deluxe').map((s) => s.id);
    expect(deluxe.sort()).toEqual([
      'axolotl',
      'blue-and-gold-fusilier',
      'golden-eagle',
      'golden-lion-tamarin',
      'great-hammerhead',
      'longfin-batfish',
    ]);
  });

  it('counts enclosure kinds as the Zoopedia does', () => {
    const count = (kind: string) =>
      SPECIES.species.filter((s) => (s.kinds as string[]).includes(kind)).length;
    expect(count('aviary')).toBe(12);
    expect(count('aquarium')).toBe(37);
    expect(count('exhibit')).toBe(46);
    expect(count('habitat')).toBe(57);
  });

  it('carries no space-requirement numbers (those stay user-entered)', () => {
    for (const s of SPECIES.species) {
      expect(Object.keys(s)).not.toContain('requirements');
    }
  });

  it('can be looked up by id', () => {
    expect(getSpecies('lion')?.commonName).toBe('Lion');
    expect(getSpecies('nope')).toBeUndefined();
  });

  it('only uses regions that exist in biomes.json', () => {
    const known = new Set([...BIOMES.regions.land, ...BIOMES.regions.ocean]);
    for (const s of SPECIES.species) for (const r of s.regions) expect(known).toContain(r);
  });
});

describe('colour contrast of the map palette (docs/07)', () => {
  const fills: Array<{ name: string; fill: string; ink: string }> = [
    ...OBJECT_TYPES.habitatKinds.map((k) => ({ name: k.id, fill: k.defaultFill, ink: k.ink })),
    ...OBJECT_TYPES.subZones.map((z) => ({ name: z.id, fill: z.fill, ink: z.ink })),
    ...OBJECT_TYPES.buildingTypes.map((b) => ({ name: b.id, fill: b.fill, ink: b.ink })),
    ...OBJECT_TYPES.areaPalette.swatches.map((s) => ({
      name: `swatch ${s.id}`,
      fill: s.fill,
      ink: s.ink,
    })),
  ];

  it.each(fills)(
    '$name: listed ink is the better of black/white and reaches 4.5:1',
    ({ fill, ink }) => {
      expect(ink.toUpperCase()).toBe(bestInk(fill));
      expect(contrastRatio(fill, ink)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('the dark casing stroke is at least 3:1 against every biome ground', () => {
    for (const b of MAP_BIOMES) {
      expect(contrastRatio(OBJECT_TYPES.casing.outer, b.ground as string)).toBeGreaterThanOrEqual(
        3,
      );
    }
  });
});
