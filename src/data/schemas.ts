/**
 * Zod schemas for the static files in /data. A malformed data file fails the build,
 * because every page imports src/data/index.ts, which parses them.
 */
import { z } from '../lib/zod.ts';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected a #RRGGBB colour');
const id = z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$|^[a-z]+[A-Za-z0-9]*$/, 'Expected a lowercase id');
const sourceKind = z.enum(['official', 'community', 'design']);
const url = z.url();

/** A pattern id from the pattern library (src/planner/map/patterns.ts mirrors this list). */
export const PATTERN_IDS = [
  'none',
  'mesh',
  'waves',
  'waves-dense',
  'crosshatch',
  'diagonal',
  'dots',
  'cross',
  'leaf-dots',
  'horizontal',
  'vertical',
  'grid',
  'zigzag',
  'stipple',
  'chevron',
  'rings',
] as const;
const pattern = z.enum(PATTERN_IDS);
const phaseTag = z.enum(['MVP', 'P2', 'P3']);

// ───────── maps.json ─────────
export const mapPresetSchema = z.strictObject({
  id,
  label: z.string().min(1),
  modes: z.array(z.enum(['sandbox', 'franchise'])).min(1),
  widthM: z.number().positive().max(100_000),
  heightM: z.number().positive().max(100_000),
  buildableInsetM: z.number().min(0),
  verified: z.boolean(),
  verifiedOn: isoDate.nullable(),
  verifiedBy: z.string().nullable(),
  method: z.string().nullable(),
  confidence: z.enum(['low', 'medium', 'high']),
  source: z
    .array(z.strictObject({ claim: z.string().min(1), url, kind: sourceKind }))
    .min(1),
  notes: z.string(),
});

export const mapsFileSchema = z
  .strictObject({
    $comment: z.string(),
    schemaVersion: z.literal(1),
    lastReviewed: isoDate,
    units: z.literal('meters'),
    origin: z.string(),
    presets: z.array(mapPresetSchema).min(1),
    defaultPresetId: z.string(),
  })
  .refine((f) => f.presets.some((p) => p.id === f.defaultPresetId), {
    message: 'defaultPresetId must match a preset',
  })
  .refine((f) => f.presets.every((p) => !p.verified || (p.verifiedOn && p.verifiedBy && p.method)), {
    message: 'A verified preset needs verifiedOn, verifiedBy and method',
  });

// ───────── biomes.json ─────────
export const biomeSchema = z
  .strictObject({
    id,
    label: z.string().min(1),
    aka: z.array(z.string()),
    type: z.enum(['land', 'water-wetland']),
    mapGround: z.boolean(),
    verified: z.boolean(),
    ground: hex.optional(),
    pathFill: hex.optional(),
    isDefault: z.boolean().optional(),
    notes: z.string().optional(),
  })
  .refine((b) => !b.mapGround || (b.ground !== undefined && b.pathFill !== undefined), {
    message: 'A map-ground biome needs ground and pathFill colours',
  });

export const biomesFileSchema = z
  .strictObject({
    $comment: z.string(),
    schemaVersion: z.literal(1),
    lastReviewed: isoDate,
    source: z.array(z.strictObject({ url, kind: sourceKind })).min(1),
    biomes: z.array(biomeSchema).min(1),
    regions: z.strictObject({
      $comment: z.string().optional(),
      verified: z.boolean(),
      source: url,
      land: z.array(z.string().min(1)).min(1),
      ocean: z.array(z.string().min(1)).min(1),
    }),
  })
  .refine((f) => f.biomes.filter((b) => b.isDefault).length === 1, {
    message: 'Exactly one biome must be the default',
  });

// ───────── object-types.json ─────────
const habitatKindSchema = z.strictObject({
  id: z.enum(['habitat', 'aviary', 'aquarium', 'exhibit']),
  label: z.string(),
  defaultFill: hex,
  ink: hex,
  pattern,
  hasFlyingArea: z.boolean(),
  notes: z.string().optional(),
});

const subZoneSchema = z.strictObject({
  id: z.enum(['water', 'deepWater', 'climbing', 'shelter', 'flying']),
  label: z.string(),
  fill: hex,
  ink: hex,
  pattern,
  phase: phaseTag.optional(),
});

const buildingTypeSchema = z.strictObject({
  id,
  label: z.string(),
  fill: hex,
  ink: hex,
  icon: z.string().nullable(),
  pattern: pattern.optional(),
});

const pathTypeSchema = z.strictObject({
  id,
  label: z.string(),
  fill: hex,
  defaultWidthM: z.number().positive(),
  suggestedWidthRangeM: z.tuple([z.number().positive(), z.number().positive()]),
  suggestionSource: z.string(),
  dash: z.tuple([z.number().positive(), z.number().positive()]).nullable(),
  phase: phaseTag.optional(),
});

const otherTypeSchema = z.strictObject({
  id,
  label: z.string(),
  fill: hex.optional(),
  ink: hex.optional(),
  pattern: pattern.optional(),
  stroke: hex.optional(),
  strokeWidthPx: z.number().positive().optional(),
  halo: hex.optional(),
  phase: phaseTag.optional(),
});

const swatchSchema = z.strictObject({
  id,
  label: z.string(),
  fill: hex,
  ink: hex,
  pattern,
});

export const objectTypesFileSchema = z
  .strictObject({
    $comment: z.string(),
    schemaVersion: z.literal(1),
    lastReviewed: isoDate,
    casing: z.strictObject({
      outer: hex,
      inner: hex,
      outerWidthPx: z.number().positive(),
      innerWidthPx: z.number().positive(),
      nonScaling: z.boolean(),
    }),
    habitatKinds: z.array(habitatKindSchema).length(4),
    subZones: z.array(subZoneSchema).length(5),
    buildingTypes: z.array(buildingTypeSchema).min(1),
    pathTypes: z.array(pathTypeSchema).min(1),
    widthLimitsM: z.strictObject({ min: z.number().positive(), max: z.number().positive() }),
    otherTypes: z.array(otherTypeSchema),
    areaPalette: z.strictObject({ $comment: z.string(), swatches: z.array(swatchSchema).min(1) }),
  })
  .refine(
    (f) =>
      f.pathTypes.every(
        (p) => p.defaultWidthM >= f.widthLimitsM.min && p.defaultWidthM <= f.widthLimitsM.max,
      ),
    { message: 'Every default path width must sit inside widthLimitsM' },
  );

// ───────── barriers.json ─────────
export const barriersFileSchema = z
  .strictObject({
    $comment: z.string(),
    schemaVersion: z.literal(1),
    lastReviewed: isoDate,
    source: z.strictObject({ url, kind: sourceKind }),
    verified: z.boolean(),
    gradeRange: z.tuple([z.number().int(), z.number().int()]),
    barriers: z
      .array(
        z.strictObject({
          id,
          label: z.string(),
          grade: z.number().int(),
          visibility: z.enum(['transparent', 'opaque', 'one-way', 'semi-transparent']),
        }),
      )
      .min(1),
  })
  .refine((f) => f.barriers.every((b) => b.grade >= f.gradeRange[0] && b.grade <= f.gradeRange[1]), {
    message: 'Every barrier grade must sit inside gradeRange',
  });

// ───────── species.json ─────────
export const SPECIES_CATEGORIES = [
  'Herbivores',
  'Predators',
  'Primates',
  'Birds',
  'Reptiles',
  'Amphibians',
  'Fish',
  'Invertebrates',
  'Other',
] as const;
export const speciesCategorySchema = z.enum(SPECIES_CATEGORIES);
export const habitatKindIdSchema = z.enum(['habitat', 'aviary', 'aquarium', 'exhibit']);

export const speciesEntrySchema = z.strictObject({
  id,
  commonName: z.string().min(1),
  scientificName: z.string().min(1),
  kinds: z.array(habitatKindIdSchema).min(1),
  category: speciesCategorySchema,
  taxonClass: z.string().min(1),
  regions: z.array(z.string().min(1)).min(1),
  edition: z.enum(['base', 'deluxe']),
});

export const speciesFileSchema = z
  .strictObject({
    $comment: z.string(),
    schemaVersion: z.literal(1),
    lastReviewed: isoDate,
    source: z.strictObject({
      url,
      kind: sourceKind,
      retrieved: isoDate,
      notes: z.string().optional(),
    }),
    verified: z.boolean(),
    categorySource: z.literal('design'),
    species: z.array(speciesEntrySchema).min(1),
  })
  .refine((f) => new Set(f.species.map((s) => s.id)).size === f.species.length, {
    message: 'Species ids must be unique',
  });

export type MapPreset = z.infer<typeof mapPresetSchema>;
export type MapsFile = z.infer<typeof mapsFileSchema>;
export type Biome = z.infer<typeof biomeSchema>;
export type BiomesFile = z.infer<typeof biomesFileSchema>;
export type ObjectTypesFile = z.infer<typeof objectTypesFileSchema>;
export type BarriersFile = z.infer<typeof barriersFileSchema>;
export type Barrier = BarriersFile['barriers'][number];
export type SpeciesFile = z.infer<typeof speciesFileSchema>;
export type SpeciesEntry = z.infer<typeof speciesEntrySchema>;
export type SpeciesCategory = z.infer<typeof speciesCategorySchema>;
export type PatternId = (typeof PATTERN_IDS)[number];
