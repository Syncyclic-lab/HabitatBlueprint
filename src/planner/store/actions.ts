/**
 * Plan-editing commands. Each one is a single labelled undo step. Pointer, keyboard and form
 * paths all call these, so they share one code path (docs/06 "Tools are state machines").
 */
import type { Draft } from 'immer';
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import { newId, nextName } from '../../model/factory.ts';
import {
  bboxCenter,
  clampDelta,
  mirrorObject,
  objectsBBox,
  rotateObject,
  scaleObject,
  translateObject,
} from '../../model/objectGeometry.ts';
import { describeObject } from '../describe.ts';
import type {
  AnimalEntry,
  HabitatObject,
  Id,
  MapObject,
  Plan,
  PlanSettings,
  SpeciesRequirement,
  SubZone,
  ThemedArea,
} from '../../model/types.ts';
import { commit } from './history.ts';
import { getState, setState } from './store.ts';

const t = en.planner;

export const objectById = (plan: Plan, id: Id): MapObject | undefined => plan.objects.find((o) => o.id === id);

function selected(ids: readonly Id[] = getState().selection): MapObject[] {
  const plan = getState().plan;
  if (!plan) return [];
  return ids.map((id) => objectById(plan, id)).filter((o): o is MapObject => o !== undefined);
}

/** History label for a set of objects: its name, or "3 objects". */
function labelFor(objects: readonly MapObject[]): string {
  return objects.length === 1 ? (objects[0] as MapObject).name : t.history.selection(objects.length);
}

/** Objects that may be changed: locked ones are skipped (and the user is told). */
function editable(objects: MapObject[]): MapObject[] {
  const locked = objects.filter((o) => o.locked);
  if (locked.length > 0 && locked.length === objects.length) {
    announce(t.selection.locked((locked[0] as MapObject).name));
  }
  return objects.filter((o) => !o.locked);
}

function replaceObjects(d: Draft<Plan>, updated: readonly MapObject[]): void {
  const byId = new Map(updated.map((o) => [o.id, o]));
  d.objects = d.objects.map((o) => (byId.get(o.id) as Draft<MapObject> | undefined) ?? o);
}

// ───────── Selection ─────────

export function select(ids: Id[], options: { announce?: boolean } = {}): void {
  setState({ selection: ids, vertexEdit: null });
  if (options.announce === false) return;
  const plan = getState().plan;
  if (!plan) return;
  if (ids.length === 0) return;
  if (ids.length === 1) {
    const o = objectById(plan, ids[0] as Id);
    if (o) announce(t.selection.selected(describeObject(o, plan)));
  } else {
    announce(t.selection.selectedMany(ids.length));
  }
}

export function clearSelection(): void {
  if (getState().selection.length === 0) return;
  setState({ selection: [], vertexEdit: null });
  announce(t.selection.cleared);
}

export function toggleInSelection(id: Id): void {
  const sel = getState().selection;
  select(sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]);
}

/**
 * Tab / Shift+Tab through objects in z-order. Returns false at either end, so the caller
 * lets focus leave the map (no keyboard trap).
 */
export function selectNext(direction: 1 | -1): boolean {
  const plan = getState().plan;
  if (!plan) return false;
  const visible = plan.objects.filter((o) => !o.hidden);
  if (visible.length === 0) return false;
  const current = getState().selection[0];
  const index = current ? visible.findIndex((o) => o.id === current) : -1;
  const next = index === -1 ? (direction === 1 ? 0 : visible.length - 1) : index + direction;
  if (next < 0 || next >= visible.length) return false;
  select([(visible[next] as MapObject).id]);
  return true;
}

// ───────── Create, edit, delete ─────────

export function addObject(o: MapObject, options: { select?: boolean } = {}): void {
  commit(t.history.create(o.name), (d) => {
    d.objects.push(o as Draft<MapObject>);
  }, options.select === false ? {} : { select: [o.id] });
}

export function addObjects(objects: MapObject[], label: string): void {
  commit(label, (d) => {
    d.objects.push(...(objects as Draft<MapObject>[]));
  }, { select: objects.map((o) => o.id) });
}

/** Edits one object through a recipe. */
export function updateObject(id: Id, label: string, recipe: (o: Draft<MapObject>) => void): void {
  commit(label, (d) => {
    const o = d.objects.find((x) => x.id === id);
    if (o) recipe(o);
  });
}

/** Replaces one object with a new version (from objectGeometry helpers). */
export function replaceObject(next: MapObject, label: string): void {
  commit(label, (d) => replaceObjects(d, [next]));
}

export function renameObject(id: Id, name: string): void {
  const clean = name.trim();
  if (!clean) return;
  updateObject(id, t.history.rename(clean), (o) => {
    o.name = clean;
  });
}

export function deleteSelection(ids: Id[] = getState().selection): void {
  const targets = editable(selected(ids));
  if (targets.length === 0) return;
  const gone = new Set(targets.map((o) => o.id));
  commit(t.history.delete(labelFor(targets)), (d) => {
    d.objects = d.objects.filter((o) => !gone.has(o.id));
  }, { select: [] });
  announce(t.actions.deleted(targets.length));
}

export function duplicateSelection(ids: Id[] = getState().selection): void {
  const plan = getState().plan;
  const targets = selected(ids);
  if (!plan || targets.length === 0) return;
  const step = plan.settings.grid.minorM;
  const copies = targets.map((o) => {
    const moved = translateObject(o, step, step);
    const copy: MapObject = { ...moved, id: newId(), name: nextName(plan.objects, o.name.replace(/ \d+$/, '')) };
    if (copy.type === 'habitat') {
      copy.zones = copy.zones.map((z) => ({ ...z, id: newId() }));
      copy.animals = copy.animals.map((a) => ({ ...a, id: newId() }));
    }
    return copy;
  });
  commit(t.history.duplicate(labelFor(targets)), (d) => {
    d.objects.push(...(copies as Draft<MapObject>[]));
  }, { select: copies.map((c) => c.id) });
  announce(t.actions.duplicated(copies.length));
}

// ───────── Transforms ─────────

export function moveSelection(dx: number, dy: number, ids: Id[] = getState().selection): void {
  const plan = getState().plan;
  const targets = editable(selected(ids));
  if (!plan || targets.length === 0) return;
  const box = objectsBBox(targets);
  const d = box ? clampDelta(box, dx, dy, plan.settings.mapWidthM, plan.settings.mapHeightM) : { x: dx, y: dy };
  if (d.x === 0 && d.y === 0) return;
  commit(t.history.move(labelFor(targets)), (draft) =>
    replaceObjects(draft, targets.map((o) => translateObject(o, d.x, d.y))),
  );
}

export function rotateSelection(deg: number, ids: Id[] = getState().selection): void {
  const targets = editable(selected(ids));
  const box = objectsBBox(targets);
  if (!box || targets.length === 0) return;
  const pivot = bboxCenter(box);
  commit(t.history.rotate(labelFor(targets)), (d) =>
    replaceObjects(d, targets.map((o) => rotateObject(o, deg, pivot))),
  );
}

export function scaleSelection(factor: number, ids: Id[] = getState().selection): void {
  const targets = editable(selected(ids));
  const box = objectsBBox(targets);
  if (!box || targets.length === 0 || !(factor > 0)) return;
  const origin = bboxCenter(box);
  commit(t.history.resize(labelFor(targets)), (d) =>
    replaceObjects(d, targets.map((o) => scaleObject(o, factor, origin))),
  );
}

export function mirrorSelection(axis: 'h' | 'v', ids: Id[] = getState().selection): void {
  const targets = editable(selected(ids));
  const box = objectsBBox(targets);
  if (!box || targets.length === 0) return;
  const pivot = bboxCenter(box);
  commit(t.history.mirror(labelFor(targets)), (d) =>
    replaceObjects(d, targets.map((o) => mirrorObject(o, axis, pivot))),
  );
}

export type ReorderHow = 'forward' | 'backward' | 'front' | 'back';

export function reorderSelection(how: ReorderHow, ids: Id[] = getState().selection): void {
  const targets = selected(ids);
  if (targets.length === 0) return;
  const set = new Set(targets.map((o) => o.id));
  commit(t.history.reorder(labelFor(targets)), (d) => {
    const objs = [...d.objects];
    if (how === 'front' || how === 'back') {
      const moving = objs.filter((o) => set.has(o.id));
      const rest = objs.filter((o) => !set.has(o.id));
      d.objects = how === 'front' ? [...rest, ...moving] : [...moving, ...rest];
      return;
    }
    // Step by one: walk from the end we're moving towards so neighbours don't leapfrog.
    const order = how === 'forward' ? [...objs.keys()].reverse() : [...objs.keys()];
    for (const i of order) {
      const j = how === 'forward' ? i + 1 : i - 1;
      const o = objs[i];
      const n = objs[j];
      if (o && n && set.has(o.id) && !set.has(n.id)) {
        objs[i] = n;
        objs[j] = o;
      }
    }
    d.objects = objs;
  });
}

export function setLocked(locked: boolean, ids: Id[] = getState().selection): void {
  const targets = selected(ids);
  if (targets.length === 0) return;
  const set = new Set(ids);
  commit(t.history.lock(labelFor(targets)), (d) => {
    for (const o of d.objects) if (set.has(o.id)) o.locked = locked;
  });
}

export function setHidden(hidden: boolean, ids: Id[] = getState().selection): void {
  const targets = selected(ids);
  if (targets.length === 0) return;
  const set = new Set(ids);
  commit(t.history.hide(labelFor(targets)), (d) => {
    for (const o of d.objects) if (set.has(o.id)) o.hidden = hidden;
  });
}

export function setAreaFor(areaId: Id | undefined, ids: Id[] = getState().selection): void {
  const set = new Set(ids);
  commit(t.history.areas, (d) => {
    for (const o of d.objects) {
      if (!set.has(o.id)) continue;
      if (areaId) o.areaId = areaId;
      else delete o.areaId;
    }
  });
}

// ───────── Habitat zones and animals ─────────

const habitatDraft = (d: Draft<Plan>, id: Id) =>
  d.objects.find((o): o is Draft<HabitatObject> => o.id === id && o.type === 'habitat');

export function addZone(habitatId: Id, zone: SubZone): void {
  const plan = getState().plan;
  const hab = plan ? objectById(plan, habitatId) : undefined;
  if (!hab) return;
  commit(t.history.addZone(t.zones[zone.kind].toLowerCase(), hab.name), (d) => {
    habitatDraft(d, habitatId)?.zones.push(zone);
  });
}

export function updateZone(habitatId: Id, zone: SubZone, label: string): void {
  commit(label, (d) => {
    const h = habitatDraft(d, habitatId);
    if (!h) return;
    h.zones = h.zones.map((z) => (z.id === zone.id ? zone : z));
  });
}

export function deleteZone(habitatId: Id, zoneId: Id): void {
  const plan = getState().plan;
  const hab = plan ? objectById(plan, habitatId) : undefined;
  if (!hab || hab.type !== 'habitat') return;
  const zone = hab.zones.find((z) => z.id === zoneId);
  if (!zone) return;
  commit(t.history.deleteZone(t.zones[zone.kind].toLowerCase(), hab.name), (d) => {
    const h = habitatDraft(d, habitatId);
    if (h) h.zones = h.zones.filter((z) => z.id !== zoneId);
  });
}

export function addAnimal(habitatId: Id, entry: Omit<AnimalEntry, 'id'>): Id {
  const id = newId();
  const plan = getState().plan;
  const hab = plan ? objectById(plan, habitatId) : undefined;
  commit(t.history.animals(hab?.name ?? ''), (d) => {
    habitatDraft(d, habitatId)?.animals.push({ ...entry, id });
  });
  return id;
}

export function updateAnimal(habitatId: Id, animalId: Id, patch: Partial<Omit<AnimalEntry, 'id'>>): void {
  const plan = getState().plan;
  const hab = plan ? objectById(plan, habitatId) : undefined;
  commit(t.history.animals(hab?.name ?? ''), (d) => {
    const a = habitatDraft(d, habitatId)?.animals.find((x) => x.id === animalId);
    if (a) Object.assign(a, patch);
  });
}

export function removeAnimal(habitatId: Id, animalId: Id): void {
  const plan = getState().plan;
  const hab = plan ? objectById(plan, habitatId) : undefined;
  commit(t.history.animals(hab?.name ?? ''), (d) => {
    const h = habitatDraft(d, habitatId);
    if (h) h.animals = h.animals.filter((a) => a.id !== animalId);
  });
}

// ───────── Areas, settings, species library, plan details ─────────

export function addArea(area: ThemedArea): void {
  commit(t.history.areas, (d) => {
    d.areas.push(area);
  });
}

export function updateArea(id: Id, patch: Partial<Omit<ThemedArea, 'id'>>): void {
  commit(t.history.areas, (d) => {
    const a = d.areas.find((x) => x.id === id);
    if (a) Object.assign(a, patch);
  });
}

export function deleteArea(id: Id): void {
  commit(t.history.areas, (d) => {
    d.areas = d.areas.filter((a) => a.id !== id);
    for (const o of d.objects) if (o.areaId === id) delete o.areaId;
  });
}

export function updateSettings(recipe: (s: Draft<PlanSettings>) => void): void {
  commit(t.history.settings, (d) => recipe(d.settings));
}

export function upsertSpecies(entry: SpeciesRequirement): void {
  commit(t.history.species, (d) => {
    const i = d.speciesLibrary.findIndex((s) => s.id === entry.id);
    if (i === -1) d.speciesLibrary.push(entry);
    else d.speciesLibrary[i] = entry;
  });
}

export function deleteSpecies(id: Id): void {
  commit(t.history.species, (d) => {
    d.speciesLibrary = d.speciesLibrary.filter((s) => s.id !== id);
    for (const o of d.objects) {
      if (o.type !== 'habitat') continue;
      for (const a of o.animals) if (a.speciesId === id) delete a.speciesId;
    }
  });
}

export function updatePlanDetails(recipe: (d: Draft<Plan>) => void): void {
  commit(t.history.plan, recipe);
}
