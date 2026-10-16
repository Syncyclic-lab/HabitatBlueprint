/**
 * Zod schemas for plans, plan files and share links. Everything imported is treated as
 * hostile (docs/09): unknown keys are rejected, strings and arrays are capped, numbers must be
 * finite, and every coordinate must lie within the plan's map (±1 m).
 */
import { z } from '../lib/zod.ts';
import { SPECIES_CATEGORIES } from '../data/schemas.ts';
import type { MapObject, Plan, Vec2 } from './types.ts';

export const LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  shareLinkChars: 64 * 1024,
  objects: 5000,
  pointsPerShape: 5000,
  zonesPerHabitat: 50,
  animalsPerHabitat: 200,
  areas: 500,
  species: 1000,
  snapshots: 200,
  nameChars: 60,
  subtitleChars: 120,
  notesChars: 2000,
  labelChars: 200,
  shortText: 120,
  idChars: 40,
  mapMaxM: 100_000,
} as const;

const id = z
  .string()
  .min(1)
  .max(LIMITS.idChars)
  .regex(/^[\w-]+$/);
const text = (max: number) => z.string().max(max);
const num = z.number();
const nonNeg = z.number().min(0);
const count = z.number().int().min(0).max(999);

const vec2 = z.strictObject({ x: num, y: num });
const points = (min: number) => z.array(vec2).min(min).max(LIMITS.pointsPerShape);

export const shapeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('polygon'),
    points: points(3),
    holes: z.array(points(3)).max(100).optional(),
    cornerRadiusM: nonNeg.max(1000).optional(),
  }),
  z.strictObject({
    kind: z.literal('rect'),
    x: num,
    y: num,
    w: z.number().positive(),
    h: z.number().positive(),
    rotationDeg: num,
    cornerRadiusM: nonNeg.max(1000).optional(),
  }),
  z.strictObject({
    kind: z.literal('ellipse'),
    cx: num,
    cy: num,
    rx: z.number().positive(),
    ry: z.number().positive(),
    rotationDeg: num,
  }),
]);

const polyline = z.strictObject({ points: points(2), smooth: z.boolean() });

const habitatKind = z.enum(['habitat', 'aviary', 'aquarium', 'exhibit']);
const zoneKind = z.enum(['water', 'deepWater', 'climbing', 'shelter', 'flying']);

const base = {
  id,
  name: text(LIMITS.nameChars),
  areaId: id.optional(),
  phase: z.number().int().min(1).max(99),
  locked: z.boolean(),
  hidden: z.boolean(),
  notes: text(LIMITS.notesChars).optional(),
};

const animalSchema = z.strictObject({
  id,
  catalogId: id.optional(),
  speciesId: id.optional(),
  displayName: text(LIMITS.nameChars),
  males: count,
  females: count,
  juveniles: count,
});

export const objectSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...base,
    type: z.literal('habitat'),
    kind: habitatKind,
    shape: shapeSchema,
    zones: z
      .array(z.strictObject({ id, kind: zoneKind, shape: shapeSchema }))
      .max(LIMITS.zonesPerHabitat),
    animals: z.array(animalSchema).max(LIMITS.animalsPerHabitat),
    barrier: z
      .strictObject({
        barrierId: id,
        edgeOverrides: z
          .record(
            z.string().regex(/^\d{1,5}$/),
            z.strictObject({ barrierId: id.optional(), viewing: z.boolean().optional() }),
          )
          .optional(),
      })
      .optional(),
  }),
  z.strictObject({ ...base, type: z.literal('building'), buildingType: id, shape: shapeSchema }),
  z.strictObject({
    ...base,
    type: z.literal('path'),
    pathType: id,
    line: polyline,
    widthM: z.number().min(1).max(20),
    cap: z.enum(['round', 'flat']),
  }),
  z.strictObject({ ...base, type: z.literal('plaza'), shape: shapeSchema }),
  z.strictObject({ ...base, type: z.literal('water'), shape: shapeSchema, deep: z.boolean() }),
  z.strictObject({ ...base, type: z.literal('planting'), shape: shapeSchema }),
  z.strictObject({ ...base, type: z.literal('barrier'), barrierId: id, line: polyline }),
  z.strictObject({
    ...base,
    type: z.literal('icon'),
    iconId: id,
    at: vec2,
    sizing: z.enum(['screen', 'map']),
    sizeM: z.number().positive().max(1000),
    rotationDeg: num,
  }),
  z.strictObject({
    ...base,
    type: z.literal('label'),
    text: text(LIMITS.labelChars),
    at: vec2,
    sizing: z.enum(['screen', 'map']),
    size: z.number().positive().max(1000),
    rotationDeg: num,
  }),
  z.strictObject({
    ...base,
    type: z.literal('measure'),
    mode: z.enum(['distance', 'area']),
    points: points(2),
  }),
]);

const areaRequirement = z
  .strictObject({ baseM2: nonNeg.max(1e7), perExtraM2: nonNeg.max(1e7) })
  .nullable();

export const speciesRequirementSchema = z.strictObject({
  id,
  catalogId: id.optional(),
  commonName: text(LIMITS.nameChars).min(1),
  kind: habitatKind,
  category: z.enum(SPECIES_CATEGORIES),
  requirements: z.strictObject({
    land: areaRequirement,
    water: areaRequirement,
    deepWater: areaRequirement,
    climbing: areaRequirement,
    flying: areaRequirement,
  }),
  includedInBase: z.number().int().min(1).max(999),
  groupSize: z.strictObject({ min: count, max: count }).optional(),
  temperatureC: z
    .strictObject({ min: z.number().min(-100).max(100), max: z.number().min(-100).max(100) })
    .optional(),
  barrierGrade: z.number().int().min(1).max(6).optional(),
  origin: z.enum(['user', 'starter']),
  verified: z.boolean(),
});

const iso = z
  .string()
  .max(40)
  .regex(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);

export const planSettingsSchema = z.strictObject({
  mapPresetId: id,
  mapWidthM: z.number().positive().max(LIMITS.mapMaxM),
  mapHeightM: z.number().positive().max(LIMITS.mapMaxM),
  mode: z.enum(['sandbox', 'franchise']),
  biomeId: id,
  region: text(LIMITS.shortText).optional(),
  units: z.enum(['metric', 'imperial']),
  grid: z.strictObject({
    visible: z.boolean(),
    minorM: z.number().positive().max(1000),
    majorEvery: z.number().int().min(1).max(100),
  }),
  snap: z.strictObject({
    enabled: z.boolean(),
    grid: z.boolean(),
    vertices: z.boolean(),
    edges: z.boolean(),
    angleStepDeg: z.number().min(1).max(90),
    guides: z.boolean(),
  }),
  display: z.strictObject({
    showAreasOnMap: z.boolean(),
    style: z.enum(['clear', 'poster']),
    patterns: z.boolean(),
    phaseFilter: z.number().int().min(1).max(99).optional(),
  }),
  requirementBufferPct: z.number().min(0).max(50),
});

const planShape = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  name: text(LIMITS.nameChars).min(1),
  subtitle: text(LIMITS.subtitleChars).optional(),
  createdAt: iso,
  updatedAt: iso,
  settings: planSettingsSchema,
  areas: z
    .array(z.strictObject({ id, name: text(LIMITS.nameChars).min(1), swatchId: id }))
    .max(LIMITS.areas),
  objects: z.array(objectSchema).max(LIMITS.objects),
  speciesLibrary: z.array(speciesRequirementSchema).max(LIMITS.species),
  titleBlock: z.strictObject({
    logoAssetId: id.optional(),
    showLegend: z.boolean(),
    showScale: z.boolean(),
    showNorth: z.boolean(),
  }),
  tracing: z
    .strictObject({
      assetId: id,
      description: text(LIMITS.subtitleChars).optional(),
      opacity: z.number().min(0).max(1),
      locked: z.boolean(),
      hidden: z.boolean(),
      transform: z.strictObject({ a: num, b: num, c: num, d: num, e: num, f: num }),
      widthPx: z.number().int().positive().max(20_000),
      heightPx: z.number().int().positive().max(20_000),
    })
    .optional(),
  snapshots: z
    .array(z.strictObject({ id, name: text(LIMITS.nameChars), createdAt: iso }))
    .max(LIMITS.snapshots),
});

/** Every point a plan stores, for the bounds check. */
export function planPoints(objects: readonly MapObject[]): Vec2[] {
  const out: Vec2[] = [];
  const shapePts = (s: z.infer<typeof shapeSchema>) => {
    if (s.kind === 'polygon') out.push(...s.points, ...(s.holes ?? []).flat());
    else if (s.kind === 'rect') out.push({ x: s.x, y: s.y }, { x: s.x + s.w, y: s.y + s.h });
    else out.push({ x: s.cx - s.rx, y: s.cy - s.ry }, { x: s.cx + s.rx, y: s.cy + s.ry });
  };
  for (const o of objects) {
    if ('shape' in o) shapePts(o.shape);
    if (o.type === 'habitat') for (const zone of o.zones) shapePts(zone.shape);
    if ('line' in o) out.push(...o.line.points);
    if ('at' in o) out.push(o.at);
    if (o.type === 'measure') out.push(...o.points);
  }
  return out;
}

/** Bounds check slack (docs/05): coordinates may sit up to 1 m outside the map. */
const BOUNDS_SLACK_M = 1;

export const planSchema = planShape.superRefine((plan, ctx) => {
  const { mapWidthM: w, mapHeightM: h } = plan.settings;
  const outside = planPoints(plan.objects as MapObject[]).find(
    (p) =>
      p.x < -BOUNDS_SLACK_M ||
      p.y < -BOUNDS_SLACK_M ||
      p.x > w + BOUNDS_SLACK_M ||
      p.y > h + BOUNDS_SLACK_M,
  );
  if (outside) {
    ctx.addIssue({ code: 'custom', message: 'A point lies outside the map', path: ['objects'] });
  }
  const ids = new Set<string>();
  for (const o of plan.objects) {
    if (ids.has(o.id))
      ctx.addIssue({ code: 'custom', message: 'Duplicate object id', path: ['objects'] });
    ids.add(o.id);
  }
});

export const planFileSchema = z.strictObject({
  format: z.literal('habitat-blueprint-plan'),
  formatVersion: z.literal(1),
  exportedAt: iso,
  app: z.strictObject({ name: text(LIMITS.shortText), version: text(20) }),
  plan: planSchema,
  assets: z
    .record(
      id,
      z
        .string()
        .max(LIMITS.fileBytes)
        .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
    )
    .optional(),
});

export type PlanFile = z.infer<typeof planFileSchema>;

// Type-level check: what the schema accepts must be a valid Plan (docs/05).
type Assignable<T extends U, U> = T;
export type PlanSchemaMatches = Assignable<z.infer<typeof planSchema>, Plan>;
