/**
 * The stored plan (docs/05-data-model.md). TypeScript is the source of truth; schema.ts has the
 * matching Zod schemas and a type-level test keeps them in step. Measurements (areas,
 * perimeters…) are derived, never stored.
 */
import type { Polyline, Shape, Vec2 } from '../geometry/types.ts';

export type { Polyline, Shape, Vec2 };

export type Id = string;
export type Iso = string;

export type PlanMode = 'sandbox' | 'franchise';
export type HabitatKind = 'habitat' | 'aviary' | 'aquarium' | 'exhibit';
export type ZoneKind = 'water' | 'deepWater' | 'climbing' | 'shelter' | 'flying';
export type SpeciesCategory =
  | 'Herbivores'
  | 'Predators'
  | 'Primates'
  | 'Birds'
  | 'Reptiles'
  | 'Amphibians'
  | 'Fish'
  | 'Invertebrates'
  | 'Other';

export interface PlanSettings {
  mapPresetId: string;
  /** Copied from the preset at creation: plans keep their own size. */
  mapWidthM: number;
  mapHeightM: number;
  mode: PlanMode;
  biomeId: string;
  region?: string;
  units: 'metric' | 'imperial';
  grid: { visible: boolean; minorM: number; majorEvery: number };
  snap: {
    enabled: boolean;
    grid: boolean;
    vertices: boolean;
    edges: boolean;
    angleStepDeg: number;
    guides: boolean;
  };
  display: {
    showAreasOnMap: boolean;
    style: 'clear' | 'poster';
    patterns: boolean;
    phaseFilter?: number;
  };
  /** 0–50, default 10. */
  requirementBufferPct: number;
}

export interface ThemedArea {
  id: Id;
  name: string;
  swatchId: string;
}

interface BaseObject {
  id: Id;
  name: string;
  areaId?: Id;
  phase: number;
  locked: boolean;
  hidden: boolean;
  notes?: string;
}

export interface SubZone {
  id: Id;
  kind: ZoneKind;
  shape: Shape;
}

export interface AnimalEntry {
  id: Id;
  /** Species from data/species.json. */
  catalogId?: string;
  /** Entry in the plan's species library (requirements the user entered). */
  speciesId?: Id;
  displayName: string;
  males: number;
  females: number;
  juveniles: number;
}

export interface HabitatBarrier {
  barrierId: string;
  /** Per-edge overrides, keyed by edge index. */
  edgeOverrides?: Record<string, { barrierId?: string; viewing?: boolean }>;
}

export interface HabitatObject extends BaseObject {
  type: 'habitat';
  kind: HabitatKind;
  shape: Shape;
  zones: SubZone[];
  animals: AnimalEntry[];
  barrier?: HabitatBarrier;
}

export interface BuildingObject extends BaseObject {
  type: 'building';
  buildingType: string;
  shape: Shape;
}

export interface PathObject extends BaseObject {
  type: 'path';
  pathType: string;
  line: Polyline;
  widthM: number;
  cap: 'round' | 'flat';
}

export interface PlazaObject extends BaseObject {
  type: 'plaza';
  shape: Shape;
}

export interface WaterObject extends BaseObject {
  type: 'water';
  shape: Shape;
  deep: boolean;
}

export interface PlantingObject extends BaseObject {
  type: 'planting';
  shape: Shape;
}

export interface BarrierObject extends BaseObject {
  type: 'barrier';
  barrierId: string;
  line: Polyline;
}

export interface IconObject extends BaseObject {
  type: 'icon';
  iconId: string;
  at: Vec2;
  sizing: 'screen' | 'map';
  sizeM: number;
  rotationDeg: number;
}

export interface LabelObject extends BaseObject {
  type: 'label';
  text: string;
  at: Vec2;
  sizing: 'screen' | 'map';
  /** Pixels when screen-sized, meters when map-sized. */
  size: number;
  rotationDeg: number;
}

export interface MeasureObject extends BaseObject {
  type: 'measure';
  mode: 'distance' | 'area';
  points: Vec2[];
}

export type MapObject =
  | HabitatObject
  | BuildingObject
  | PathObject
  | PlazaObject
  | WaterObject
  | PlantingObject
  | BarrierObject
  | IconObject
  | LabelObject
  | MeasureObject;

export type ObjectType = MapObject['type'];

export type ShapeObject = Extract<MapObject, { shape: Shape }>;
export type LineObject = Extract<MapObject, { line: Polyline }>;

export interface AreaRequirement {
  baseM2: number;
  perExtraM2: number;
}

export interface SpeciesRequirement {
  id: Id;
  catalogId?: string;
  commonName: string;
  kind: HabitatKind;
  category: SpeciesCategory;
  requirements: {
    land: AreaRequirement | null;
    water: AreaRequirement | null;
    deepWater: AreaRequirement | null;
    climbing: AreaRequirement | null;
    flying: AreaRequirement | null;
  };
  /** How many animals the base figure covers (default 1; see open question Q7). */
  includedInBase: number;
  groupSize?: { min: number; max: number };
  temperatureC?: { min: number; max: number };
  barrierGrade?: number;
  origin: 'user' | 'starter';
  verified: boolean;
}

export interface TracingImage {
  assetId: Id;
  description?: string;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  /** Image pixels → map meters: x' = a·x + c·y + e, y' = b·x + d·y + f. */
  transform: { a: number; b: number; c: number; d: number; e: number; f: number };
  /** Natural size in pixels, for drawing. */
  widthPx: number;
  heightPx: number;
}

export interface SnapshotRef {
  id: Id;
  name: string;
  createdAt: Iso;
}

export interface TitleBlock {
  logoAssetId?: Id;
  showLegend: boolean;
  showScale: boolean;
  showNorth: boolean;
}

export interface Plan {
  schemaVersion: 1;
  id: Id;
  name: string;
  subtitle?: string;
  createdAt: Iso;
  updatedAt: Iso;
  settings: PlanSettings;
  areas: ThemedArea[];
  /** Array order is z-order: first is drawn at the bottom. */
  objects: MapObject[];
  speciesLibrary: SpeciesRequirement[];
  titleBlock: TitleBlock;
  tracing?: TracingImage;
  snapshots: SnapshotRef[];
}
