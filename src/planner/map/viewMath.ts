/** Screen ↔ map conversions and zoom maths. Pure functions. */
import type { BBox, Vec2 } from '../../geometry/types.ts';
import { MAX_ZOOM, MIN_ZOOM, type ViewState } from '../store/store.ts';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Grid lines closer than this on screen are thinned out (a coarser step is drawn). */
export const GRID_MIN_PX = 12;

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function viewBox(v: ViewState): ViewBox {
  const w = v.width / v.zoom;
  const h = v.height / v.zoom;
  return { x: v.cx - w / 2, y: v.cy - h / 2, w, h };
}

/** A point in viewport pixels (from its top-left) to map meters. */
export function screenToMap(v: ViewState, sx: number, sy: number): Vec2 {
  return { x: v.cx + (sx - v.width / 2) / v.zoom, y: v.cy + (sy - v.height / 2) / v.zoom };
}

export function mapToScreen(v: ViewState, p: Vec2): Vec2 {
  return { x: (p.x - v.cx) * v.zoom + v.width / 2, y: (p.y - v.cy) * v.zoom + v.height / 2 };
}

/** Keeps the view centre within the map (plus half a viewport), so the map can't be lost. */
export function clampCenter(v: ViewState, mapW: number, mapH: number): ViewState {
  const halfW = v.width / (2 * v.zoom);
  const halfH = v.height / (2 * v.zoom);
  return {
    ...v,
    cx: Math.min(mapW + halfW * 0.5, Math.max(-halfW * 0.5, v.cx)),
    cy: Math.min(mapH + halfH * 0.5, Math.max(-halfH * 0.5, v.cy)),
  };
}

/** Zooms by `factor`, keeping the map point under `anchor` (viewport pixels) still. */
export function zoomAt(
  v: ViewState,
  factor: number,
  anchor: Vec2 = { x: v.width / 2, y: v.height / 2 },
): ViewState {
  const before = screenToMap(v, anchor.x, anchor.y);
  const zoom = clampZoom(v.zoom * factor);
  const next = { ...v, zoom };
  const after = screenToMap(next, anchor.x, anchor.y);
  return { ...next, cx: v.cx + (before.x - after.x), cy: v.cy + (before.y - after.y) };
}

/** Shows the whole box with a margin. */
export function fitBox(v: ViewState, box: BBox, margin = 0.9): ViewState {
  const w = Math.max(box.maxX - box.minX, 1);
  const h = Math.max(box.maxY - box.minY, 1);
  const zoom = clampZoom(Math.min(v.width / w, v.height / h) * margin);
  return { ...v, zoom, cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2 };
}

/** Pans as little as possible so `p` sits at least `marginPx` inside the viewport. */
export function ensureVisible(v: ViewState, p: Vec2, marginPx = 48): ViewState {
  const s = mapToScreen(v, p);
  let dx = 0;
  let dy = 0;
  if (s.x < marginPx) dx = s.x - marginPx;
  else if (s.x > v.width - marginPx) dx = s.x - (v.width - marginPx);
  if (s.y < marginPx) dy = s.y - marginPx;
  else if (s.y > v.height - marginPx) dy = s.y - (v.height - marginPx);
  if (dx === 0 && dy === 0) return v;
  return { ...v, cx: v.cx + dx / v.zoom, cy: v.cy + dy / v.zoom };
}

/** Zoom as a percentage of 1 screen pixel per meter. */
export const zoomPercent = (v: ViewState): number => Math.round(v.zoom * 100);
