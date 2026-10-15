# 05 · Data model

TypeScript is the source of truth (`src/model/types.ts`). Matching Zod schemas live in `src/model/schema.ts`, and `z.infer` types must stay assignable to these interfaces (add a type-level test). Everything below is **stored**. Measurements (area, perimeter, etc.) are **derived** and never stored, so they can't go stale.

```ts
// ───────── primitives ─────────
export type Id = string;                       // nanoid(12)
export type Vec2 = { x: number; y: number };   // meters, rounded to 0.01 on write
export type Iso = string;                      // ISO-8601 timestamp

// ───────── plan (one zoo) ─────────
export interface Plan {
  schemaVersion: 1;
  id: Id;
  name: string;                 // zoo name, 1–60 chars
  subtitle?: string;            // ≤ 120 chars
  createdAt: Iso;
  updatedAt: Iso;
  settings: PlanSettings;
  areas: ThemedArea[];          // legend groups, in legend order
  objects: MapObject[];         // array order = z-order (first = bottom)
  speciesLibrary: SpeciesRequirement[];  // user's own entries (+ optional starter entries, P3)
  titleBlock?: { logoAssetId?: Id; showLegend: boolean; showScale: boolean; showNorth: boolean };
  tracing?: TracingImage;       // P2; asset bytes live in IndexedDB, not in the plan JSON
  snapshots?: SnapshotRef[];    // P2
}

export interface PlanSettings {
  mapPresetId: string;          // from data/maps.json
  mapWidthM: number;            // copied from the preset at creation (plans keep their own size)
  mapHeightM: number;
  mode: 'sandbox' | 'franchise';
  biomeId: string;              // from data/biomes.json
  region?: string;              // optional metadata
  units: 'metric' | 'imperial'; // display only
  grid: { visible: boolean; minorM: number; majorEvery: number };
  snap: { enabled: boolean; grid: boolean; vertices: boolean; edges: boolean; angleStepDeg: number; guides: boolean };
  display: { showAreasOnMap: boolean; style: 'clear' | 'poster'; patterns: boolean; phaseFilter?: number };
  requirementBufferPct: number; // 0–50, default 10
}

export interface ThemedArea {
  id: Id;
  name: string;                 // e.g. "African grasslands"
  swatchId: string;             // from object-types.json areaPalette
  legendCategoryOrder?: string[];
}

// ───────── shapes ─────────
export type Shape =
  | { kind: 'polygon'; points: Vec2[]; holes?: Vec2[][]; cornerRadiusM?: number }   // ≥3 points, simple (no self-intersection), clockwise
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rotationDeg: number; cornerRadiusM?: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotationDeg: number };

export type Polyline = { points: Vec2[]; smooth: boolean };   // ≥2 points

// ───────── objects ─────────
interface BaseObject {
  id: Id;
  name: string;                 // auto-named "Habitat 4" etc. until renamed
  areaId?: Id;                  // themed area
  phase: number;                // build phase, default 1 (P2 UI)
  locked: boolean;
  hidden: boolean;
  notes?: string;               // ≤ 2,000 chars
  style?: { swatchId?: string; fill?: string; pattern?: string };  // overrides
}

export interface HabitatObject extends BaseObject {
  type: 'habitat';
  kind: 'habitat' | 'aviary' | 'aquarium' | 'exhibit';
  shape: Shape;
  zones: SubZone[];             // clipped to shape when measured
  animals: AnimalEntry[];
  barrier?: { barrierId: string; edgeOverrides?: Record<number, { barrierId?: string; viewing?: boolean }> };
  sharedEdges?: Array<{ edgeIndex: number; otherId: Id; otherEdgeIndex: number }>;
}

export interface SubZone {
  id: Id;
  kind: 'water' | 'deepWater' | 'climbing' | 'shelter' | 'flying';
  shape: Shape;
}

export interface AnimalEntry {
  id: Id;
  speciesId?: Id;               // link into speciesLibrary
  displayName: string;          // free text if not linked
  males: number;                // 0–999
  females: number;
  juveniles?: number;
  iconId?: string;              // from icon manifest; fallback 'paw'
}

export interface BuildingObject extends BaseObject { type: 'building'; buildingType: string; shape: Shape }
export interface PathObject     extends BaseObject { type: 'path'; pathType: string; line: Polyline; widthM: number; cap: 'round' | 'flat' }
export interface PlazaObject    extends BaseObject { type: 'plaza'; shape: Shape }
export interface WaterObject    extends BaseObject { type: 'water'; shape: Shape; deep?: boolean }
export interface PlantingObject extends BaseObject { type: 'planting'; shape: Shape }
export interface BarrierObject  extends BaseObject { type: 'barrier'; barrierId: string; line: Polyline }
export interface IconObject     extends BaseObject { type: 'icon'; iconId: string; at: Vec2; sizing: 'screen' | 'map'; sizeM?: number; rotationDeg: number }
export interface LabelObject    extends BaseObject { type: 'label'; text: string; at: Vec2; sizing: 'screen' | 'map'; size: number; rotationDeg: number; leaderTo?: Vec2 }
export interface MeasureObject  extends BaseObject { type: 'measure'; mode: 'distance' | 'area'; points: Vec2[] }

export type MapObject =
  | HabitatObject | BuildingObject | PathObject | PlazaObject | WaterObject
  | PlantingObject | BarrierObject | IconObject | LabelObject | MeasureObject;

// ───────── species library ─────────
export interface AreaRequirement { baseM2: number; perExtraM2: number }
export interface SpeciesRequirement {
  id: Id;
  commonName: string;
  kind: 'habitat' | 'aviary' | 'aquarium' | 'exhibit';
  category: 'Herbivores' | 'Predators' | 'Primates' | 'Birds' | 'Reptiles' | 'Amphibians' | 'Fish' | 'Invertebrates' | 'Other';
  regions?: string[];
  requirements: { land: AreaRequirement | null; water: AreaRequirement | null; deepWater: AreaRequirement | null; climbing: AreaRequirement | null; flying: AreaRequirement | null };
  includedInBase: number;       // how many animals the base figure covers (default 1)
  groupSize?: { min: number; max: number };
  temperatureC?: { min: number; max: number };
  barrierGrade?: number;        // 1–6
  iconId?: string;
  origin: 'user' | 'starter';   // starter = P3 curated list
  verified: boolean;            // user entries default true ("I checked this in-game"); starter entries false until confirmed
}

// ───────── assets & versions ─────────
export interface TracingImage {
  assetId: Id;                  // Blob in IndexedDB store 'assets'
  description?: string;
  opacity: number;              // 0–1
  locked: boolean;
  hidden: boolean;
  transform: { a: number; b: number; c: number; d: number; e: number; f: number };  // image px → map meters (affine)
}
export interface SnapshotRef { id: Id; name: string; createdAt: Iso }
```

## Derived measurements (`src/geometry/measure.ts`)
```ts
export interface HabitatMeasure {
  totalM2: number;
  waterM2: number;        // union(water, deepWater) ∩ shape
  deepWaterM2: number;    // union(deepWater) ∩ shape
  landM2: number;         // total − water
  climbingM2: number;     // union(climbing) ∩ shape
  flyingM2: number;       // aviary: union(flying) ∩ shape, or total if no flying zones
  perimeterM: number;     // outer ring + holes
  pctOfMap: number;       // totalM2 / (mapW × mapH)
}
export interface PlanTotals {
  mapM2: number;
  plannedM2: number;      // union of all ground-occupying objects
  habitatM2: number;      // union of habitats
  freeM2: number;         // mapM2 − plannedM2
  pathLengthByType: Record<string, number>;
  barrierLengthByGrade: Record<number, number>;   // shared habitat edges counted once
  animalCensus: Array<{ name: string; males: number; females: number; juveniles: number }>;
}
```
Memoize per object by a structural hash of its geometry, and recompute totals incrementally. Totals for a 150-object plan must take under 16 ms.

## IndexedDB layout (`idb`, database `zoo-plotter`, version 1)
| Store | Key | Value |
|---|---|---|
| `plans` | `id` | `Plan` |
| `planIndex` | `id` | `{ id, name, updatedAt, objectCount, thumbnail? }` for the plans list |
| `assets` | `id` | `Blob` (tracing images, logos) |
| `snapshots` | `[planId, snapshotId]` | `Plan` |
| `prefs` | key | app preferences (shortcuts, panel sizes, last plan) |

Write migrations as `migrate(v → v+1)` pure functions with fixture tests, and run them on load and on file import.

## File format (`.zooplan.json`)
```json
{ "format": "zoo-plotter-plan", "formatVersion": 1, "exportedAt": "…", "app": { "name": "Zoo Plotter", "version": "1.0.0" },
  "plan": { /* Plan */ }, "assets": { /* optional: id → base64 data URL, only if the user ticks 'include images' */ } }
```
Import rules: ≤ 10 MB; strict Zod parse; unknown keys rejected; strings length-capped; numbers finite and within map bounds ±1 m; every ID re-generated on import to avoid collisions; data URLs must be `image/png|jpeg|webp` and must decode.

## Share link
`/planner#plan=<lz-string compressToEncodedURIComponent(JSON.stringify(stripAssets(plan)))>`
Opening it: parse with the same validator → offer "Save a copy to my plans" → open it. Never auto-overwrite.
