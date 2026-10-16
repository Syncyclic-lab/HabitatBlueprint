/**
 * IndexedDB storage (docs/05 "IndexedDB layout"). Everything stays in this browser. If
 * IndexedDB isn't available (some private modes), every function resolves without storing and
 * the planner shows a banner suggesting Save to file.
 */
import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DB_NAME } from '../../config/site.ts';
import { planSchema } from '../../model/schema.ts';
import type { Id, Plan } from '../../model/types.ts';

export interface PlanIndexEntry {
  id: Id;
  name: string;
  updatedAt: string;
  objectCount: number;
}

interface Schema extends DBSchema {
  plans: { key: string; value: Plan };
  planIndex: { key: string; value: PlanIndexEntry };
  assets: { key: string; value: Blob };
  snapshots: { key: string; value: { key: string; planId: Id; plan: Plan } };
  prefs: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<Schema> | null> | null = null;

/** Opens (or creates) the database once. Resolves null if IndexedDB can't be used. */
export function db(): Promise<IDBPDatabase<Schema> | null> {
  dbPromise ??= (async () => {
    try {
      if (typeof indexedDB === 'undefined') return null;
      return await openDB<Schema>(DB_NAME, 1, {
        upgrade(database) {
          database.createObjectStore('plans');
          database.createObjectStore('planIndex');
          database.createObjectStore('assets');
          database.createObjectStore('snapshots');
          database.createObjectStore('prefs');
        },
      });
    } catch {
      return null;
    }
  })();
  return dbPromise;
}

export async function storageAvailable(): Promise<boolean> {
  return (await db()) !== null;
}

export const indexEntry = (plan: Plan): PlanIndexEntry => ({
  id: plan.id,
  name: plan.name,
  updatedAt: plan.updatedAt,
  objectCount: plan.objects.length,
});

/** Saves a plan and its index entry in one transaction. */
export async function savePlan(plan: Plan): Promise<boolean> {
  const d = await db();
  if (!d) return false;
  const tx = d.transaction(['plans', 'planIndex'], 'readwrite');
  await Promise.all([
    tx.objectStore('plans').put(plan, plan.id),
    tx.objectStore('planIndex').put(indexEntry(plan), plan.id),
    tx.done,
  ]);
  return true;
}

/** Loads a plan, validating it (a damaged record is skipped rather than crashing the app). */
export async function loadPlan(id: Id): Promise<Plan | null> {
  const d = await db();
  if (!d) return null;
  const raw = await d.get('plans', id);
  if (!raw) return null;
  const parsed = planSchema.safeParse(raw);
  return parsed.success ? (parsed.data as Plan) : null;
}

export async function listPlans(): Promise<PlanIndexEntry[]> {
  const d = await db();
  if (!d) return [];
  const all = await d.getAll('planIndex');
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deletePlan(id: Id): Promise<void> {
  const d = await db();
  if (!d) return;
  const tx = d.transaction(['plans', 'planIndex', 'snapshots'], 'readwrite');
  await tx.objectStore('plans').delete(id);
  await tx.objectStore('planIndex').delete(id);
  const snapStore = tx.objectStore('snapshots');
  for (const key of await snapStore.getAllKeys()) {
    if (key.startsWith(`${id}/`)) await snapStore.delete(key);
  }
  await tx.done;
}

export async function saveAsset(id: Id, blob: Blob): Promise<void> {
  const d = await db();
  if (d) await d.put('assets', blob, id);
}

export async function loadAsset(id: Id): Promise<Blob | null> {
  const d = await db();
  return d ? ((await d.get('assets', id)) ?? null) : null;
}

export async function deleteAsset(id: Id): Promise<void> {
  const d = await db();
  if (d) await d.delete('assets', id);
}

export async function saveSnapshot(planId: Id, snapshotId: Id, plan: Plan): Promise<void> {
  const d = await db();
  const key = `${planId}/${snapshotId}`;
  if (d) await d.put('snapshots', { key, planId, plan }, key);
}

export async function loadSnapshot(planId: Id, snapshotId: Id): Promise<Plan | null> {
  const d = await db();
  if (!d) return null;
  const rec = await d.get('snapshots', `${planId}/${snapshotId}`);
  if (!rec) return null;
  const parsed = planSchema.safeParse(rec.plan);
  return parsed.success ? (parsed.data as Plan) : null;
}

export async function deleteSnapshot(planId: Id, snapshotId: Id): Promise<void> {
  const d = await db();
  if (d) await d.delete('snapshots', `${planId}/${snapshotId}`);
}

/** Removes the whole database and our localStorage keys (Delete all my data). */
export async function deleteAllData(): Promise<void> {
  const d = await db();
  d?.close();
  dbPromise = null;
  try {
    await deleteDB(DB_NAME);
  } catch {
    // Nothing stored, or storage blocked: nothing to delete.
  }
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('hb:')) localStorage.removeItem(key);
  } catch {
    // localStorage blocked.
  }
}
