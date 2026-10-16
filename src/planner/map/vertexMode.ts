/**
 * Vertex editing (docs/03 §2.4): Enter on a selected shape enters vertex mode; Tab moves between
 * points, arrows move the current point, Insert adds a point after it, Delete removes it, Esc
 * leaves. Rectangles and ellipses become polygons when their points are edited.
 */
import type { Draft } from 'immer';
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import type { Vec2 } from '../../geometry/types.ts';
import { toPolygonShape } from '../../geometry/transform.ts';
import { clampToMap } from '../../geometry/snap.ts';
import { midpoint, roundPoint } from '../../geometry/vec.ts';
import { formatNumber } from '../../lib/format.ts';
import type { MapObject } from '../../model/types.ts';
import { objectById, updateObject } from '../store/actions.ts';
import { getState, setState } from '../store/store.ts';
import { revealPoint } from '../store/view.ts';
import { editablePoints } from './layers.tsx';

const t = en.planner;

function current(): { o: MapObject; points: Vec2[]; index: number; zoneId: string | null } | null {
  const { plan, vertexEdit } = getState();
  if (!plan || !vertexEdit) return null;
  const o = objectById(plan, vertexEdit.objectId);
  if (!o) return null;
  const points = editablePoints(o, vertexEdit.zoneId);
  return points ? { o, points, index: vertexEdit.index, zoneId: vertexEdit.zoneId } : null;
}

/** Minimum points for the object's kind: 3 for areas, 2 for lines. */
const minPoints = (o: MapObject): number =>
  'shape' in o ? 3 : o.type === 'measure' && o.mode === 'area' ? 3 : 2;

function announceVertex(): void {
  const c = current();
  if (!c) return;
  const p = c.points[c.index] as Vec2;
  announce(
    t.selection.vertex(c.index + 1, c.points.length, formatNumber(p.x, 1), formatNumber(p.y, 1)),
  );
}

/** Writes new points back into the object (or its zone). */
function setPoints(o: MapObject, zoneId: string | null, points: Vec2[], label: string): void {
  updateObject(o.id, label, (d: Draft<MapObject>) => {
    if (d.type === 'habitat' && zoneId) {
      const z = d.zones.find((x) => x.id === zoneId);
      if (z && z.shape.kind === 'polygon') z.shape.points = points;
      return;
    }
    if ('shape' in d && d.shape.kind === 'polygon') d.shape.points = points;
    else if ('line' in d) d.line.points = points;
    else if (d.type === 'measure') d.points = points;
  });
}

export function enterVertexMode(zoneId: string | null = null): boolean {
  const { plan, selection } = getState();
  if (!plan || selection.length !== 1) return false;
  const o = objectById(plan, selection[0] as string);
  if (!o || o.locked) return false;
  if ('shape' in o && !zoneId && o.shape.kind !== 'polygon') {
    const poly = toPolygonShape(o.shape);
    updateObject(o.id, t.history.edit(o.name), (d) => {
      if ('shape' in d) d.shape = poly;
    });
  }
  const fresh = objectById(getState().plan as NonNullable<typeof plan>, o.id) as MapObject;
  const points = editablePoints(fresh, zoneId);
  if (!points) return false;
  setState({ vertexEdit: { objectId: o.id, zoneId, index: 0 } });
  announce(t.selection.vertexMode(o.name, points.length));
  return true;
}

export function exitVertexMode(): void {
  if (!getState().vertexEdit) return;
  setState({ vertexEdit: null });
  announce(t.selection.vertexDone);
}

export function nextVertex(direction: 1 | -1): void {
  const c = current();
  if (!c) return;
  const index = (c.index + direction + c.points.length) % c.points.length;
  setState({ vertexEdit: { objectId: c.o.id, zoneId: c.zoneId, index } });
  revealPoint(c.points[index] as Vec2);
  announceVertex();
}

export function setVertexIndex(index: number): void {
  const c = current();
  if (!c) return;
  setState({ vertexEdit: { objectId: c.o.id, zoneId: c.zoneId, index } });
}

export function moveVertexTo(p: Vec2, label?: string): void {
  const c = current();
  const plan = getState().plan;
  if (!c || !plan) return;
  const next = roundPoint(clampToMap(p, plan.settings.mapWidthM, plan.settings.mapHeightM));
  const points = c.points.map((q, i) => (i === c.index ? next : q));
  setPoints(c.o, c.zoneId, points, label ?? t.history.editPoint(c.o.name));
}

export function nudgeVertex(dx: number, dy: number): void {
  const c = current();
  if (!c) return;
  const p = c.points[c.index] as Vec2;
  moveVertexTo({ x: p.x + dx, y: p.y + dy });
  revealPoint({ x: p.x + dx, y: p.y + dy });
  announceVertex();
}

export function insertVertex(): void {
  const c = current();
  if (!c) return;
  const a = c.points[c.index] as Vec2;
  const b = c.points[(c.index + 1) % c.points.length] as Vec2;
  const isClosed = 'shape' in c.o || (c.o.type === 'measure' && c.o.mode === 'area');
  const atEnd = !isClosed && c.index === c.points.length - 1;
  const p = atEnd ? { x: a.x + 5, y: a.y } : midpoint(a, b);
  const points = [...c.points.slice(0, c.index + 1), roundPoint(p), ...c.points.slice(c.index + 1)];
  setPoints(c.o, c.zoneId, points, t.history.addPoint(c.o.name));
  setState({ vertexEdit: { objectId: c.o.id, zoneId: c.zoneId, index: c.index + 1 } });
  announceVertex();
}

export function deleteVertex(): void {
  const c = current();
  if (!c || c.points.length <= minPoints(c.o)) return;
  const points = c.points.filter((_, i) => i !== c.index);
  setPoints(c.o, c.zoneId, points, t.history.removePoint(c.o.name));
  setState({ vertexEdit: { objectId: c.o.id, zoneId: c.zoneId, index: Math.max(0, c.index - 1) } });
  announceVertex();
}
