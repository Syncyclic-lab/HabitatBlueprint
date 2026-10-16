/** View commands: pan, zoom, fit. These never touch the plan or undo history. */
import type { BBox, Vec2 } from '../../geometry/types.ts';
import { objectsBBox } from '../../model/objectGeometry.ts';
import { clampCenter, ensureVisible, fitBox, zoomAt } from '../map/viewMath.ts';
import { getState, setState, type ViewState } from './store.ts';

function setView(next: ViewState): void {
  const plan = getState().plan;
  setState({
    view: plan ? clampCenter(next, plan.settings.mapWidthM, plan.settings.mapHeightM) : next,
  });
}

export function setViewportSize(width: number, height: number): void {
  const s = getState();
  const v = s.view;
  if (width <= 0 || height <= 0) return;
  if (v.width !== width || v.height !== height || !s.viewportMeasured) {
    setState({ view: { ...v, width, height }, viewportMeasured: true });
  }
  applyPendingFit();
}

/** Fits a newly opened plan once the viewport has a real size. */
export function applyPendingFit(): void {
  const s = getState();
  if (!s.fitPending || !s.viewportMeasured || !s.plan) return;
  setState({ fitPending: false });
  fitMap();
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

/**
 * Where the view would be after panning by (dx, dy) screen pixels, clamped like panBy, as the
 * on-screen shift of the map in pixels. Used to slide the drawn map during a drag (MapView).
 */
export function panPreview(dxPx: number, dyPx: number): Vec2 {
  const s = getState();
  const v = s.view;
  const next = { ...v, cx: v.cx + dxPx / v.zoom, cy: v.cy + dyPx / v.zoom };
  const clamped = s.plan
    ? clampCenter(next, s.plan.settings.mapWidthM, s.plan.settings.mapHeightM)
    : next;
  return { x: (v.cx - clamped.cx) * v.zoom, y: (v.cy - clamped.cy) * v.zoom };
}
