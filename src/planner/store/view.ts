/** View commands: pan, zoom, fit. These never touch the plan or undo history. */
import type { BBox, Vec2 } from '../../geometry/types.ts';
import { objectsBBox } from '../../model/objectGeometry.ts';
import { clampCenter, ensureVisible, fitBox, zoomAt } from '../map/viewMath.ts';
import { getState, setState, type ViewState } from './store.ts';

function setView(next: ViewState): void {
  const plan = getState().plan;
  setState({ view: plan ? clampCenter(next, plan.settings.mapWidthM, plan.settings.mapHeightM) : next });
}

export function setViewportSize(width: number, height: number): void {
  const v = getState().view;
  if (v.width === width && v.height === height) return;
  setState({ view: { ...v, width, height } });
}

/** Pans by a screen distance in pixels (positive = view moves east/south). */
export function panBy(dxPx: number, dyPx: number): void {
  const v = getState().view;
  setView({ ...v, cx: v.cx + dxPx / v.zoom, cy: v.cy + dyPx / v.zoom });
}

export function zoomBy(factor: number, anchor?: Vec2): void {
  setView(zoomAt(getState().view, factor, anchor));
}

export function centerOn(p: Vec2): void {
  setView({ ...getState().view, cx: p.x, cy: p.y });
}

export function fitMap(): void {
  const plan = getState().plan;
  if (!plan) return;
  const { mapWidthM: w, mapHeightM: h } = plan.settings;
  setView(fitBox(getState().view, { minX: 0, minY: 0, maxX: w, maxY: h }, 0.95));
}

export function zoomToBox(box: BBox): void {
  setView(fitBox(getState().view, box, 0.7));
}

export function zoomToSelection(): void {
  const { plan, selection } = getState();
  if (!plan) return;
  const objs = plan.objects.filter((o) => selection.includes(o.id));
  const box = objectsBBox(objs);
  if (box) zoomToBox(box);
}

/** Pans so a map point is comfortably inside the view (WCAG 2.4.11: never hide focus). */
export function revealPoint(p: Vec2, marginPx = 64): void {
  const v = getState().view;
  const next = ensureVisible(v, p, marginPx);
  if (next !== v) setView(next);
}

export function revealBox(box: BBox): void {
  const v = getState().view;
  const w = (box.maxX - box.minX) * v.zoom;
  const h = (box.maxY - box.minY) * v.zoom;
  if (w > v.width * 0.9 || h > v.height * 0.9) {
    zoomToBox(box);
    return;
  }
  revealPoint({ x: box.minX, y: box.minY });
  revealPoint({ x: box.maxX, y: box.maxY });
}
