/**
 * Plan files (.zooplan.json) and share links. Everything imported is hostile until proven
 * otherwise (docs/09): size-capped, strictly parsed with Zod, unknown keys rejected, and every
 * id regenerated on import so nothing collides with existing plans.
 */
import LZString from 'lz-string';
import {
  APP_VERSION,
  PLAN_FILE_EXTENSION,
  PLAN_FILE_FORMAT,
  SITE_NAME,
} from '../../config/site.ts';
import { LIMITS, planFileSchema, planSchema, type PlanFile } from '../../model/schema.ts';
import { newId, nowIso } from '../../model/factory.ts';
import type { MapObject, Plan } from '../../model/types.ts';

export function planToFile(plan: Plan, assets?: Record<string, string>): PlanFile {
  return {
    format: PLAN_FILE_FORMAT,
    formatVersion: 1,
    exportedAt: nowIso(),
    app: { name: SITE_NAME, version: APP_VERSION },
    plan,
    ...(assets && Object.keys(assets).length > 0 ? { assets } : {}),
  };
}

/** A safe file name from the zoo name, e.g. "Crystal Ridge Zoo" → "crystal-ridge-zoo". */
export function fileSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return slug || 'zoo-plan';
}

/** Starts a download of a Blob with the given file name. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function savePlanFile(plan: Plan, assets?: Record<string, string>): string {
  const filename = `${fileSlug(plan.name)}${PLAN_FILE_EXTENSION}`;
  const json = JSON.stringify(planToFile(plan, assets), null, 2);
  downloadBlob(new Blob([json], { type: 'application/json' }), filename);
  return filename;
}

export type ImportResult =
  { ok: true; file: PlanFile } | { ok: false; reason: 'tooBig' | 'invalid' };

/** Parses untrusted JSON text into a plan file. */
export function parsePlanText(text: string): ImportResult {
  if (text.length > LIMITS.fileBytes) return { ok: false, reason: 'tooBig' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const parsed = planFileSchema.safeParse(data);
  return parsed.success ? { ok: true, file: parsed.data } : { ok: false, reason: 'invalid' };
}

export async function readPlanFile(file: File): Promise<ImportResult> {
  if (file.size > LIMITS.fileBytes) return { ok: false, reason: 'tooBig' };
  return parsePlanText(await file.text());
}

/** Gives a plan and everything inside it fresh ids, and keeps references consistent. */
export function withFreshIds(plan: Plan, name?: string): Plan {
  const areaIds = new Map(plan.areas.map((a) => [a.id, newId()]));
  const speciesIds = new Map(plan.speciesLibrary.map((s) => [s.id, newId()]));
  const objects = plan.objects.map((o): MapObject => {
    const areaId = o.areaId ? areaIds.get(o.areaId) : undefined;
    const base = { ...o, id: newId() };
    if (areaId) base.areaId = areaId;
    else delete base.areaId;
    if (base.type === 'habitat') {
      return {
        ...base,
        zones: base.zones.map((z) => ({ ...z, id: newId() })),
        animals: base.animals.map((a) => {
          const speciesId = a.speciesId ? speciesIds.get(a.speciesId) : undefined;
          const copy = { ...a, id: newId() };
          if (speciesId) copy.speciesId = speciesId;
          else delete copy.speciesId;
          return copy;
        }),
      };
    }
    return base;
  });
  const now = nowIso();
  const { tracing: _tracing, ...rest } = plan;
  return {
    ...rest,
    id: newId(),
    name: name ?? plan.name,
    createdAt: now,
    updatedAt: now,
    areas: plan.areas.map((a) => ({ ...a, id: areaIds.get(a.id) as string })),
    speciesLibrary: plan.speciesLibrary.map((s) => ({ ...s, id: speciesIds.get(s.id) as string })),
    objects,
    snapshots: [],
    titleBlock: { ...plan.titleBlock, logoAssetId: undefined },
  };
}

// ───────── Share links ─────────

/** The plan without images (tracing and logo stay on the device). */
export function stripAssets(plan: Plan): Plan {
  const { tracing: _tracing, ...rest } = plan;
  const { logoAssetId: _logo, ...titleBlock } = plan.titleBlock;
  return { ...rest, titleBlock, snapshots: [] };
}

export function shareLink(plan: Plan, pageUrl: string): string {
  const packed = LZString.compressToEncodedURIComponent(JSON.stringify(stripAssets(plan)));
  const url = new URL(pageUrl);
  url.hash = `plan=${packed}`;
  return url.toString();
}

/** Reads #plan=… from a URL fragment. Returns null if absent, or an error if unusable. */
export function readShareFragment(hash: string): ImportResult | null {
  if (!hash.startsWith('#plan=')) return null;
  const packed = hash.slice('#plan='.length);
  if (packed.length > LIMITS.shareLinkChars) return { ok: false, reason: 'tooBig' };
  const json = LZString.decompressFromEncodedURIComponent(packed);
  if (!json || json.length > LIMITS.fileBytes) return { ok: false, reason: 'invalid' };
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const parsed = planSchema.safeParse(data);
  if (!parsed.success) return { ok: false, reason: 'invalid' };
  return { ok: true, file: planToFile(parsed.data as Plan) };
}
