/**
 * The map: an SVG in meters inside a focusable role="application" region (docs/08 "Map
 * semantics"). Every pointer action fires on pointer-up and has a keyboard or typed equivalent;
 * drags are optional conveniences (WCAG 2.5.7).
 */
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { en } from '../../i18n/en.ts';
import type { BBox, Vec2 } from '../../geometry/types.ts';
import { distance, roundPoint } from '../../geometry/vec.ts';
import { clampToMap, snapToGrid } from '../../geometry/snap.ts';
import { bboxesOverlap } from '../../geometry/polygon.ts';
import {
  bboxCenter,
  objectBBox,
  objectsBBox,
  resizeObject,
  rotateObject,
  translateObject,
  clampDelta,
} from '../../model/objectGeometry.ts';
import type { MapObject } from '../../model/types.ts';
import { describeObject } from '../describe.ts';
import { objectById, select, toggleInSelection, clearSelection } from '../store/actions.ts';
import {
  beginTransaction,
  cancelTransaction,
  endTransaction,
  updateTransaction,
} from '../store/history.ts';
import { getState, setState, usePlanner } from '../store/store.ts';
import { panBy, panPreview, setViewportSize, zoomBy } from '../store/view.ts';
import { draftPreview, finishDraft, finishFreehand, placePoint } from '../tools/drawing.ts';
import { shapeModeFor, toolKind } from '../tools/tools.ts';
import { ContextMenu } from './ContextMenu.tsx';
import { handleMapKey } from './keys.ts';
import {
  Crosshair,
  DraftLayer,
  editablePoints,
  Grid,
  Ground,
  ObjectView,
  SelectionLayer,
  type HandleId,
} from './layers.tsx';
import { DrawReadout, EmptyPrompt, NorthArrow, ScaleBar, ZoomControls } from './Overlays.tsx';
import { Patterns } from './Patterns.tsx';
import { cachedObjectFill, groundColor, LAYER_RANK } from './style.ts';
import { screenToMap, viewBox, type ViewBox } from './viewMath.ts';
import { setVertexIndex, moveVertexTo } from './vertexMode.ts';

const t = en.planner;
const DRAG_PX = 4;

/**
 * The SVG is drawn this share of the viewport larger on every side. While the map is dragged,
 * the drawn picture just slides (a cheap GPU move, no repainting) and the hidden margin slides
 * into view; the view is committed and redrawn when the drag ends or the margin runs out.
 */
const OVERSCAN = 0.25;

/** The viewBox including the overscan margin. */
function overscanBox(vb: ViewBox, zoom: number, width: number, height: number): ViewBox {
  const mx = (width * OVERSCAN) / zoom;
  const my = (height * OVERSCAN) / zoom;
  return { x: vb.x - mx, y: vb.y - my, w: vb.w + 2 * mx, h: vb.h + 2 * my };
}

type Gesture =
  /** last: where the pointer was when the view was last committed. */
  | { kind: 'pan'; last: Vec2 }
  | { kind: 'pinch'; dist: number }
  | {
      kind: 'move';
      down: Vec2;
      downMap: Vec2;
      dragging: boolean;
      originals: MapObject[];
      box: BBox;
      clickedId: string;
      wasSelected: boolean;
      additive: boolean;
    }
  | { kind: 'marquee'; down: Vec2; downMap: Vec2; dragging: boolean; additive: boolean }
  | { kind: 'resize'; handle: Exclude<HandleId, 'rotate'>; original: MapObject; box: BBox }
  | { kind: 'rotate'; centre: Vec2; startAngle: number; originals: MapObject[] }
  | { kind: 'vertex' }
  | { kind: 'draw'; down: Vec2; downMap: Vec2; dragging: boolean }
  | { kind: 'freehand'; points: Vec2[] };

/** Viewport-relative position of a pointer event. */
function localPoint(el: HTMLElement, e: { clientX: number; clientY: number }): Vec2 {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

const toMap = (p: Vec2): Vec2 => screenToMap(getState().view, p.x, p.y);

function clampMap(p: Vec2): Vec2 {
  const plan = getState().plan;
  return plan ? clampToMap(p, plan.settings.mapWidthM, plan.settings.mapHeightM) : p;
}

/** Snaps a move delta to the grid (unless snapping is off or Alt is held). */
function snapDelta(dx: number, dy: number): Vec2 {
  const s = getState();
  const snap = s.plan?.settings.snap;
  if (!snap?.enabled || !snap.grid || s.snapSuspended) return { x: dx, y: dy };
  return snapToGrid({ x: dx, y: dy }, s.plan?.settings.grid.minorM ?? 1);
}

function newBoxFromHandle(
  handle: Exclude<HandleId, 'rotate'>,
  box: BBox,
  p: Vec2,
  keepRatio: boolean,
): BBox {
  const min = 0.5;
  let { minX, minY, maxX, maxY } = box;
  if (handle.includes('w')) minX = Math.min(p.x, maxX - min);
  if (handle.includes('e')) maxX = Math.max(p.x, minX + min);
  if (handle.includes('n')) minY = Math.min(p.y, maxY - min);
  if (handle.includes('s')) maxY = Math.max(p.y, minY + min);
  if (keepRatio && handle.length === 2) {
    const ratio = (box.maxX - box.minX) / (box.maxY - box.minY);
    const w = maxX - minX;
    const h = maxY - minY;
    if (w / h > ratio) {
      const nh = w / ratio;
      if (handle.includes('n')) minY = maxY - nh;
      else maxY = minY + nh;
    } else {
      const nw = h * ratio;
      if (handle.includes('w')) minX = maxX - nw;
      else maxX = minX + nw;
    }
  }
  return { minX, minY, maxX, maxY };
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const plan = usePlanner((s) => s.plan);
  const tool = usePlanner((s) => s.tool);
  const vertexEdit = usePlanner((s) => s.vertexEdit);
  const [focused, setFocused] = useState(false);
  const [menuAt, setMenuAt] = useState<Vec2 | null>(null);
  const [marquee, setMarquee] = useState<BBox | null>(null);
  const [panning, setPanning] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const touches = useRef(new Map<number, Vec2>());
  const spaceDown = useRef(false);
  const pointerFrame = useRef<number | null>(null);
  const latestPointer = useRef<Vec2 | null>(null);

  // Track the viewport size.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setViewportSize(Math.round(r.width), Math.round(r.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel zoom needs a non-passive listener so the page doesn't scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey && !e.ctrlKey) {
        panBy(e.deltaY, 0);
        return;
      }
      const scale = e.deltaMode === 1 ? 40 : 1;
      const factor = Math.exp(-e.deltaY * scale * (e.ctrlKey ? 0.01 : 0.0015));
      zoomBy(factor, localPoint(el, e));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /** Pointer position updates are batched to one per frame. */
  const reportPointer = (p: Vec2 | null) => {
    latestPointer.current = p;
    if (pointerFrame.current !== null) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = null;
      setState({ pointer: latestPointer.current, inputMode: 'pointer' });
    });
  };

  const openMenuAtSelection = () => {
    const s = getState();
    const el = containerRef.current;
    if (!s.plan || !el || s.selection.length === 0) return;
    const objs = s.plan.objects.filter((o) => s.selection.includes(o.id));
    const box = objectsBBox(objs);
    if (!box) return;
    const p = screenFromMap(bboxCenter(box));
    setMenuAt({
      x: Math.min(Math.max(p.x, 8), s.view.width - 8),
      y: Math.min(Math.max(p.y, 8), s.view.height - 8),
    });
  };

  const screenFromMap = (p: Vec2): Vec2 => {
    const v = getState().view;
    return { x: (p.x - v.cx) * v.zoom + v.width / 2, y: (p.y - v.cy) * v.zoom + v.height / 2 };
  };

  /** Moves the drawn map by `shift` screen pixels without redrawing it. */
  const slideMap = (shift: Vec2 | null) => {
    const svg = containerRef.current?.querySelector<SVGSVGElement>('.map-svg');
    if (svg) svg.style.transform = shift ? `translate(${shift.x}px, ${shift.y}px)` : '';
  };

  /** Commits a pan drag to the view; React redraws the map in the same frame. */
  const commitPan = (g: Extract<Gesture, { kind: 'pan' }>, local: Vec2) => {
    slideMap(null);
    panBy(g.last.x - local.x, g.last.y - local.y);
    g.last = local;
  };

  // ───────── Pointer ─────────

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el || !getState().plan) return;
    el.focus({ preventScroll: true });
    if (e.button === 2) return; // context menu handles right-click
    const local = localPoint(el, e);
    if (e.pointerType === 'touch') {
      touches.current.set(e.pointerId, local);
      if (touches.current.size === 2) {
        if (gesture.current && gesture.current.kind !== 'pan' && gesture.current.kind !== 'pinch')
          cancelTransaction();
        const [a, b] = [...touches.current.values()] as [Vec2, Vec2];
        gesture.current = { kind: 'pinch', dist: distance(a, b) };
        return;
      }
    }
    el.setPointerCapture(e.pointerId);
    const s = getState();
    const map = toMap(local);

    if (e.button === 1 || spaceDown.current) {
      gesture.current = { kind: 'pan', last: local };
      setPanning(true);
      return;
    }

    const target = e.target as Element;
    const kind = toolKind(s.tool, s.options);

    if (kind !== 'select') {
      if (kind === 'shape' && shapeModeFor(s.tool, s.options) === 'freehand') {
        gesture.current = { kind: 'freehand', points: [map] };
        setState({ draft: { points: [roundPoint(clampMap(map))] } });
        return;
      }
      gesture.current = { kind: 'draw', down: local, downMap: map, dragging: false };
      return;
    }

    // Select tool: vertex handles, resize/rotate handles, objects, empty ground.
    const vertexEl = target.closest('[data-vertex]');
    if (vertexEl && s.vertexEdit) {
      setVertexIndex(Number(vertexEl.getAttribute('data-vertex')));
      beginTransaction(t.history.editPoint(''));
      gesture.current = { kind: 'vertex' };
      return;
    }
    const handleEl = target.closest('[data-handle]');
    if (handleEl && s.selection.length === 1 && s.plan) {
      const o = objectById(s.plan, s.selection[0] as string);
      if (o && !o.locked) {
        const handle = handleEl.getAttribute('data-handle') as HandleId;
        const box = objectBBox(o);
        if (handle === 'rotate') {
          const centre = bboxCenter(box);
          beginTransaction(t.history.rotate(o.name));
          gesture.current = {
            kind: 'rotate',
            centre,
            startAngle: Math.atan2(map.y - centre.y, map.x - centre.x),
            originals: [o],
          };
        } else {
          beginTransaction(t.history.resize(o.name));
          gesture.current = { kind: 'resize', handle, original: o, box };
        }
        return;
      }
    }
    const objEl = target.closest('[data-id]');
    const id = objEl?.getAttribute('data-id');
    if (id && s.plan) {
      const additive = e.shiftKey;
      const wasSelected = s.selection.includes(id);
      if (!wasSelected) {
        if (additive) toggleInSelection(id);
        else select([id]);
      }
      const ids = getState().selection;
      const originals = s.plan.objects.filter((o) => ids.includes(o.id) && !o.locked);
      gesture.current = {
        kind: 'move',
        down: local,
        downMap: map,
        dragging: false,
        originals,
        box: objectsBBox(originals) ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        clickedId: id,
        wasSelected,
        additive,
      };
      return;
    }
    gesture.current = {
      kind: 'marquee',
      down: local,
      downMap: map,
      dragging: false,
      additive: e.shiftKey,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const local = localPoint(el, e);
    const g = gesture.current;
    if (e.pointerType === 'touch' && touches.current.has(e.pointerId))
      touches.current.set(e.pointerId, local);
    if (!g) {
      reportPointer(toMap(local));
      return;
    }
    const map = toMap(local);
    switch (g.kind) {
      case 'pan': {
        const shift = panPreview(g.last.x - local.x, g.last.y - local.y);
        const v = getState().view;
        if (
          Math.abs(shift.x) > v.width * OVERSCAN * 0.8 ||
          Math.abs(shift.y) > v.height * OVERSCAN * 0.8
        ) {
          commitPan(g, local);
        } else {
          slideMap(shift);
        }
        return;
      }
      case 'pinch': {
        const [a, b] = [...touches.current.values()] as [Vec2, Vec2];
        if (!a || !b) return;
        const d = distance(a, b);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (g.dist > 0) zoomBy(d / g.dist, mid);
        g.dist = d;
        return;
      }
      case 'move': {
        if (!g.dragging && distance(local, g.down) < DRAG_PX) return;
        const s = getState();
        if (!g.dragging) {
          if (g.originals.length === 0) return;
          g.dragging = true;
          beginTransaction(
            t.history.move(
              g.originals.length === 1
                ? (g.originals[0] as MapObject).name
                : t.history.selection(g.originals.length),
            ),
          );
        }
        const raw = snapDelta(map.x - g.downMap.x, map.y - g.downMap.y);
        const plan = s.plan;
        if (!plan) return;
        const d = clampDelta(
          g.box,
          raw.x,
          raw.y,
          plan.settings.mapWidthM,
          plan.settings.mapHeightM,
        );
        const moved = new Map(g.originals.map((o) => [o.id, translateObject(o, d.x, d.y)]));
        updateTransaction((draft) => {
          draft.objects = draft.objects.map((o) => (moved.get(o.id) as typeof o | undefined) ?? o);
        });
        reportPointer(map);
        return;
      }
      case 'marquee': {
        if (!g.dragging && distance(local, g.down) < DRAG_PX) return;
        g.dragging = true;
        setMarquee({
          minX: Math.min(g.downMap.x, map.x),
          minY: Math.min(g.downMap.y, map.y),
          maxX: Math.max(g.downMap.x, map.x),
          maxY: Math.max(g.downMap.y, map.y),
        });
        return;
      }
      case 'resize': {
        const p = clampMap(map);
        const box = newBoxFromHandle(
          g.handle,
          g.box,
          getState().snapSuspended ? p : snapToGrid(p, snapStep()),
          e.shiftKey,
        );
        const next = resizeObject(g.original, g.box, box);
        updateTransaction((draft) => {
          draft.objects = draft.objects.map((o) => (o.id === next.id ? (next as typeof o) : o));
        });
        return;
      }
      case 'rotate': {
        const angle = Math.atan2(map.y - g.centre.y, map.x - g.centre.x);
        let deg = ((angle - g.startAngle) * 180) / Math.PI;
        deg = e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
        const rotated = new Map(g.originals.map((o) => [o.id, rotateObject(o, deg, g.centre)]));
        updateTransaction((draft) => {
          draft.objects = draft.objects.map(
            (o) => (rotated.get(o.id) as typeof o | undefined) ?? o,
          );
        });
        return;
      }
      case 'vertex': {
        const p = getState().snapSuspended ? map : snapToGrid(map, snapStep());
        moveVertexTo(p);
        return;
      }
      case 'draw':
        if (!g.dragging && distance(local, g.down) >= DRAG_PX) g.dragging = true;
        reportPointer(map);
        return;
      case 'freehand': {
        const last = g.points[g.points.length - 1] as Vec2;
        if (distance(last, map) * getState().view.zoom >= 3) {
          g.points.push(map);
          setState({ draft: { points: g.points.map((p) => roundPoint(clampMap(p))) } });
        }
        return;
      }
    }
  };

  const snapStep = (): number => {
    const s = getState();
    const snap = s.plan?.settings.snap;
    return snap?.enabled && snap.grid ? (s.plan?.settings.grid.minorM ?? 1) : 0.01;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.pointerType === 'touch') touches.current.delete(e.pointerId);
    const g = gesture.current;
    gesture.current = null;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (!g) return;
    const local = localPoint(el, e);
    const map = toMap(local);
    switch (g.kind) {
      case 'pan':
        commitPan(g, local);
        setPanning(false);
        return;
      case 'pinch':
        return;
      case 'move':
        if (g.dragging) {
          endTransaction();
          return;
        }
        // A plain click on an already-selected object: Shift toggles it off; otherwise select only it.
        if (g.wasSelected) {
          if (g.additive) toggleInSelection(g.clickedId);
          else if (getState().selection.length > 1) select([g.clickedId]);
        }
        return;
      case 'marquee': {
        setMarquee(null);
        if (!g.dragging) {
          if (!g.additive) clearSelection();
          return;
        }
        const box: BBox = {
          minX: Math.min(g.downMap.x, map.x),
          minY: Math.min(g.downMap.y, map.y),
          maxX: Math.max(g.downMap.x, map.x),
          maxY: Math.max(g.downMap.y, map.y),
        };
        const plan = getState().plan;
        if (!plan) return;
        const hits = plan.objects
          .filter((o) => !o.hidden && bboxesOverlap(objectBBox(o), box))
          .map((o) => o.id);
        select(g.additive ? [...new Set([...getState().selection, ...hits])] : hits);
        return;
      }
      case 'resize':
      case 'rotate':
      case 'vertex':
        endTransaction();
        return;
      case 'draw': {
        const s = getState();
        const mode = shapeModeFor(s.tool, s.options);
        const twoPoint =
          toolKind(s.tool, s.options) === 'shape' && (mode === 'rect' || mode === 'ellipse');
        if (g.dragging && twoPoint && !s.draft) {
          // Drag-to-draw: the press is the first corner, the release the second.
          placePoint(g.downMap, 'pointer');
        }
        placePoint(map, 'pointer');
        return;
      }
      case 'freehand':
        finishFreehand(g.points);
        return;
    }
  };

  const onPointerCancel = () => {
    const g = gesture.current;
    gesture.current = null;
    touches.current.clear();
    slideMap(null);
    setPanning(false);
    setMarquee(null);
    if (
      g &&
      (g.kind === 'move' || g.kind === 'resize' || g.kind === 'rotate' || g.kind === 'vertex')
    )
      cancelTransaction();
  };

  const onDoubleClick = () => {
    const s = getState();
    const kind = toolKind(s.tool, s.options);
    if ((kind === 'line' || kind === 'shape') && s.draft && s.draft.points.length > 0) {
      finishDraft();
    }
  };

  const onContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = containerRef.current;
    const s = getState();
    if (!el || !s.plan) return;
    const id = (e.target as Element).closest('[data-id]')?.getAttribute('data-id');
    if (id && !s.selection.includes(id)) select([id]);
    if (getState().selection.length === 0) return;
    setMenuAt(localPoint(el, e));
  };

  // ───────── Keyboard ─────────

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Alt') {
      setState({ snapSuspended: true });
      e.preventDefault();
      return;
    }
    if (e.key === 'Shift') {
      setState({ constrain: true });
      return;
    }
    if (e.key === ' ' && !e.repeat) {
      spaceDown.current = true;
      e.preventDefault();
      return;
    }
    if (handleMapKey(e.nativeEvent, { openContextMenu: openMenuAtSelection })) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onKeyUp = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Alt') setState({ snapSuspended: false });
    if (e.key === 'Shift') setState({ constrain: false });
    if (e.key === ' ') {
      const wasPanning = gesture.current?.kind === 'pan';
      spaceDown.current = false;
      const s = getState();
      // Space places a point at the crosshair (docs/03 §3.1), unless it was held to pan.
      if (!wasPanning && toolKind(s.tool, s.options) !== 'select' && s.crosshair) {
        setState({ inputMode: 'keyboard' });
        placePoint(s.crosshair, 'keyboard');
      }
    }
  };

  const onFocus = () => {
    setFocused(true);
    const s = getState();
    if (s.tool !== 'select' && !s.crosshair) {
      setState({
        crosshair: roundPoint(
          snapToGrid({ x: s.view.cx, y: s.view.cy }, s.plan?.settings.grid.minorM ?? 1),
        ),
      });
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (containerRef.current?.contains(e.relatedTarget as Node | null)) return;
    setFocused(false);
    setState({ snapSuspended: false, constrain: false });
    spaceDown.current = false;
  };

  if (!plan) return null;
  const label = t.map.label(plan.name);

  return (
    <div className="pl-map" data-region="map">
      <p id="map-instructions" className="visually-hidden">
        {t.map.instructions}
      </p>
      {/*
        role="application" is deliberate (docs/08 "Map semantics"): the map has its own keyboard
        model (crosshair, nudging, Tab between objects), described by #map-instructions.
      */}
      {/* eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions -- see above */}
      <div
        ref={containerRef}
        className="map-viewport"
        role="application"
        aria-roledescription={t.map.roleDescription}
        aria-label={label}
        aria-describedby="map-instructions"
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- the application region takes focus
        tabIndex={0}
        data-region-focus="map"
        data-tool={tool}
        data-panning={panning ? 'true' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => {
          if (!gesture.current) reportPointer(null);
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <MapSvg
          marquee={marquee}
          showCrosshair={focused && tool !== 'select'}
          vertexEditing={vertexEdit !== null}
        />
      </div>
      <EmptyPrompt />
      <DrawReadout />
      <ScaleBar />
      <NorthArrow />
      <ZoomControls />
      <ContextMenu at={menuAt} onClose={() => setMenuAt(null)} />
    </div>
  );
}

interface MapSvgProps {
  marquee: BBox | null;
  showCrosshair: boolean;
  vertexEditing: boolean;
}

function MapSvg({ marquee, showCrosshair }: MapSvgProps) {
  const plan = usePlanner((s) => s.plan);
  const view = usePlanner((s) => s.view);
  if (!plan) return null;
  const vb = overscanBox(viewBox(view), view.zoom, view.width, view.height);
  const ox = view.width * OVERSCAN;
  const oy = view.height * OVERSCAN;
  const { mapWidthM: w, mapHeightM: h } = plan.settings;
  return (
    <svg
      className="map-svg"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      preserveAspectRatio="xMidYMid meet"
      // Set through the CSSOM by React, which our CSP allows (no style="" attribute).
      style={{ left: -ox, top: -oy, width: view.width + 2 * ox, height: view.height + 2 * oy }}
      aria-hidden="false"
      data-style={plan.settings.display.style}
    >
      <defs aria-hidden="true">
        <Patterns zoom={quantizeZoom(view.zoom)} />
      </defs>
      <Ground widthM={w} heightM={h} color={groundColor(plan)} />
      <TracingLayer />
      {plan.settings.grid.visible && (
        <Grid
          view={vb}
          zoom={view.zoom}
          widthM={w}
          heightM={h}
          minorM={plan.settings.grid.minorM}
          majorEvery={plan.settings.grid.majorEvery}
        />
      )}
      <ObjectsLayer viewBox={vb} zoom={view.zoom} />
      <rect x={0} y={0} width={w} height={h} className="map-edge nonscaling" aria-hidden="true" />
      <SelectionConnected zoom={view.zoom} />
      <DraftConnected zoom={view.zoom} />
      {marquee && (
        <rect
          x={marquee.minX}
          y={marquee.minY}
          width={marquee.maxX - marquee.minX}
          height={marquee.maxY - marquee.minY}
          className="sel-ants nonscaling"
          aria-hidden="true"
        />
      )}
      {showCrosshair && <CrosshairConnected zoom={view.zoom} />}
    </svg>
  );
}

/** Pattern tiles only need to change when the zoom changes noticeably. */
const quantizeZoom = (z: number): number => 2 ** (Math.round(Math.log2(z) * 4) / 4);

function TracingLayer() {
  const tracing = usePlanner((s) => s.plan?.tracing);
  const url = usePlanner((s) => s.tracingUrl);
  if (!tracing || !url || tracing.hidden) return null;
  const m = tracing.transform;
  return (
    <image
      href={url}
      width={tracing.widthPx}
      height={tracing.heightPx}
      transform={`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`}
      opacity={tracing.opacity}
      preserveAspectRatio="none"
      aria-hidden="true"
      pointerEvents="none"
    />
  );
}

/**
 * Visible objects in draw order, culled to the view (plus a margin) so big plans stay fast.
 */
const ObjectsLayer = memo(function ObjectsLayer({
  viewBox: vb,
  zoom,
}: {
  viewBox: ReturnType<typeof viewBox>;
  zoom: number;
}) {
  const plan = usePlanner((s) => s.plan);
  const ordered = useMemo(() => {
    if (!plan) return [];
    return plan.objects
      .map((o, i) => ({ o, i }))
      .sort((a, b) => LAYER_RANK[a.o.type] - LAYER_RANK[b.o.type] || a.i - b.i)
      .map(({ o }) => ({ o, box: objectBBox(o) }));
  }, [plan]);
  const labels = useMemo(() => {
    const m = new Map<string, string>();
    if (plan) for (const o of plan.objects) m.set(o.id, describeObject(o, plan));
    return m;
  }, [plan]);
  if (!plan) return null;
  const margin = 40 / zoom;
  const view: BBox = {
    minX: vb.x - margin,
    minY: vb.y - margin,
    maxX: vb.x + vb.w + margin,
    maxY: vb.y + vb.h + margin,
  };
  const phase = plan.settings.display.phaseFilter;
  const { units, display } = plan.settings;
  return (
    <g className="objects-layer">
      {ordered
        .filter(({ box }) => bboxesOverlap(box, view))
        .map(({ o }) => (
          <ObjectView
            key={o.id}
            o={o}
            style={cachedObjectFill(o, plan)}
            zoom={zoom}
            units={units}
            showAreas={display.showAreasOnMap}
            poster={display.style === 'poster'}
            phaseOut={phase !== undefined && o.phase > phase}
            label={labels.get(o.id) ?? o.name}
          />
        ))}
    </g>
  );
});

function SelectionConnected({ zoom }: { zoom: number }) {
  const plan = usePlanner((s) => s.plan);
  const selection = usePlanner((s) => s.selection);
  const vertexEdit = usePlanner((s) => s.vertexEdit);
  const tool = usePlanner((s) => s.tool);
  if (!plan || selection.length === 0) return null;
  const objects = plan.objects.filter((o) => selection.includes(o.id) && !o.hidden);
  const single = objects.length === 1 ? objects[0] : undefined;
  const box = objectsBBox(objects);
  let vertex: { points: Vec2[]; index: number } | null = null;
  if (vertexEdit) {
    const o = objectById(plan, vertexEdit.objectId);
    const points = o ? editablePoints(o, vertexEdit.zoneId) : null;
    if (points) vertex = { points, index: vertexEdit.index };
  }
  return (
    <SelectionLayer
      objects={objects}
      zoom={zoom}
      handles={tool === 'select' && single !== undefined && !single.locked && 'shape' in single}
      box={box}
      vertexEdit={vertex}
    />
  );
}

function DraftConnected({ zoom }: { zoom: number }) {
  usePlanner((s) => s.pointer);
  usePlanner((s) => s.crosshair);
  usePlanner((s) => s.constrain);
  usePlanner((s) => s.inputMode);
  const draft = usePlanner((s) => s.draft);
  const issue = usePlanner((s) => s.draftIssue);
  const tool = usePlanner((s) => s.tool);
  const options = usePlanner((s) => s.options);
  const preview = draftPreview();
  if (!preview || preview.kind === 'point' || preview.points.length === 0) return null;
  return (
    <DraftLayer
      zoom={zoom}
      points={preview.points}
      placedCount={draft?.points.length ?? 0}
      shape={preview.shape}
      kind={preview.kind}
      issueEdges={issue?.edges ?? null}
      lineWidthM={tool === 'path' && options.pathMode === 'line' ? options.pathWidthM : null}
    />
  );
}

function CrosshairConnected({ zoom }: { zoom: number }) {
  const crosshair = usePlanner((s) => s.crosshair);
  if (!crosshair) return null;
  return <Crosshair at={crosshair} zoom={zoom} />;
}
