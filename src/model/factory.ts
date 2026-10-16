/** Creating plans and objects with sensible defaults. */
import { nanoid } from 'nanoid';
import { DEFAULT_BIOME, DEFAULT_PRESET, getPreset } from '../data/index.ts';
import type { MapObject, ObjectType, Plan, PlanMode, PlanSettings } from './types.ts';

export const newId = (): string => nanoid(12);

export const nowIso = (): string => new Date().toISOString();

export interface NewPlanInput {
  name: string;
  mode: PlanMode;
  biomeId?: string;
  presetId?: string;
}

export function defaultSettings(
  input: Pick<NewPlanInput, 'mode' | 'biomeId' | 'presetId'>,
): PlanSettings {
  const preset = getPreset(input.presetId ?? DEFAULT_PRESET.id) ?? DEFAULT_PRESET;
  return {
    mapPresetId: preset.id,
    mapWidthM: preset.widthM,
    mapHeightM: preset.heightM,
    mode: input.mode,
    biomeId: input.biomeId ?? DEFAULT_BIOME.id,
    units: 'metric',
    grid: { visible: true, minorM: 5, majorEvery: 10 },
    snap: {
      enabled: true,
      grid: true,
      vertices: true,
      edges: true,
      angleStepDeg: 15,
      guides: false,
    },
    display: { showAreasOnMap: true, style: 'clear', patterns: true },
    requirementBufferPct: 10,
  };
}

export function createPlan(input: NewPlanInput): Plan {
  const now = nowIso();
  return {
    schemaVersion: 1,
    id: newId(),
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
    settings: defaultSettings(input),
    areas: [],
    objects: [],
    speciesLibrary: [],
    titleBlock: { showLegend: true, showScale: true, showNorth: true },
    snapshots: [],
  };
}

/**
 * Auto-name for a new object, e.g. "Habitat 4": one more than the highest number already used
 * with that prefix.
 */
export function nextName(objects: readonly MapObject[], prefix: string): string {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`);
  let max = 0;
  for (const o of objects) {
    const m = re.exec(o.name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix} ${max + 1}`;
}

/** Object types that cover ground and so count toward the planned area (docs/03 §2.2). */
export const GROUND_TYPES: readonly ObjectType[] = [
  'habitat',
  'building',
  'path',
  'plaza',
  'water',
  'planting',
];
