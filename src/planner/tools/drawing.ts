/**
 * The drawing engine shared by every input path (docs/06): pointer clicks, the keyboard
 * crosshair and touch all call placePoint / finishDraft / cancelDraft / removeLastPoint.
 */
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import type { Shape, Vec2 } from '../../geometry/types.ts';
import { checkRing } from '../../geometry/intersect.ts';
import { shapeToPoly } from '../../geometry/flatten.ts';
import { polyArea, ringPerimeter, signedArea } from '../../geometry/polygon.ts';
import { polylineLength } from '../../geometry/buffer.ts';
import { simplify } from '../../geometry/simplify.ts';
import {
  clampToMap,
  snapAngle,
  snapPoint,
  snapToGrid,
  type SnapKind,
  type SnapTargets,
} from '../../geometry/snap.ts';
import { shapeVertices } from '../../geometry/transform.ts';
import { distance, roundPoint } from '../../geometry/vec.ts';
import { formatNumber, speakArea, speakLength } from '../../lib/format.ts';
import { getBuildingType, getPathType, getBarrier, OBJECT_TYPES } from '../../data/index.ts';
import { newId, nextName } from '../../model/factory.ts';
import { footprint } from '../../model/totals.ts';
import type { HabitatObject, MapObject, Plan, SubZone } from '../../model/types.ts';
import { addObject, addZone, objectById, select } from '../store/actions.ts';
import {
  getState,
  setState,
  type ShapeMode,
  type ToolId,
  type ToolOptions,
} from '../store/store.ts';
import { revealPoint } from '../store/view.ts';
import { shapeModeFor, toolDef, toolKind } from './tools.ts';

const t = en.planner;

// ───────── Tool switching ─────────

export function describeTool(tool: ToolId, o: ToolOptions): string {
  const label = toolDef(tool).label;
  const kind = toolKind(tool, o);
  if (kind === 'select') return t.tools.announce.select;
  if (kind === 'line') return t.tools.announce.line(label);
  if (kind === 'point') return t.tools.announce.point(label);
  return t.tools.announce.draw(label, t.tools.shapeModes[shapeModeFor(tool, o)].toLowerCase());
}

export function setTool(tool: ToolId, options: { announce?: boolean } = {}): void {
  const s = getState();
  const view = s.view;
  const plan = s.plan;
  const grid = plan?.settings.grid.minorM ?? 1;
  const centre = snapToGrid({ x: view.cx, y: view.cy }, grid);
  const crosshair = plan
    ? clampToMap(centre, plan.settings.mapWidthM, plan.settings.mapHeightM)
    : centre;
  setState({
    tool,
    draft: null,
    draftIssue: null,
    vertexEdit: null,
    crosshair: tool === 'select' ? null : (s.crosshair ?? crosshair),
    options: tool === 'habitat' ? s.options : { ...s.options, zoneTarget: null },
  });
  if (options.announce !== false) announce(describeTool(tool, getState().options));
}

export function setOptions(patch: Partial<ToolOptions>): void {
  setState({ options: { ...getState().options, ...patch }, draft: null, draftIssue: null });
}

export function setShapeMode(mode: ShapeMode): void {
  setOptions({ shapeMode: mode });
  const { tool, options } = getState();
  announce(describeTool(tool, options));
}

/** Starts drawing a zone (water, climbing…) inside a habitat with the habitat tool. */
export function startZone(habitatId: string, kind: SubZone['kind']): void {
  setState({ options: { ...getState().options, zoneTarget: { habitatId, kind } } });
  setTool('habitat', { announce: false });
  const plan = getState().plan;
  const hab = plan ? objectById(plan, habitatId) : undefined;
  if (hab) announce(t.tools.drawingZone(t.zones[kind].toLowerCase(), hab.name));
}

// ───────── Snapping ─────────

const targetsCache = new WeakMap<MapObject[], SnapTargets>();

/** Corners and edges of every visible object, cached per version of the plan. */
export function snapTargets(plan: Plan): SnapTargets {
  const hit = targetsCache.get(plan.objects);
  if (hit) return hit;
  const vertices: Vec2[] = [];
  const segments: [Vec2, Vec2][] = [];
  for (const o of plan.objects) {
    if (o.hidden) continue;
    if ('shape' in o) {
      vertices.push(...shapeVertices(o.shape));
      if (o.shape.kind !== 'ellipse') {
        const ring = shapeToPoly(o.shape).outer;
        ring.forEach((p, i) => segments.push([p, ring[(i + 1) % ring.length] as Vec2]));
      }
      if (o.type === 'habitat') for (const z of o.zones) vertices.push(...shapeVertices(z.shape));
    } else if ('line' in o) {
      vertices.push(...o.line.points);
      o.line.points.forEach((p, i) => {
        const n = o.line.points[i + 1];
        if (n) segments.push([p, n]);
      });
    } else if ('at' in o) {
      vertices.push(o.at);
    }
  }
  const targets = { vertices, segments };
  targetsCache.set(plan.objects, targets);
  return targets;
}

/** Snaps a raw point for drawing: angle steps (Shift), then vertices/edges/grid, then the map edge. */
export function snapForDrawing(raw: Vec2, from?: Vec2): { point: Vec2; kind: SnapKind } {
  const s = getState();
  const plan = s.plan;
  if (!plan) return { point: raw, kind: 'none' };
  const { snap, grid, mapWidthM: w, mapHeightM: h } = { ...plan.settings };
  let p = raw;
  if (from && s.constrain && s.tool !== 'select') p = snapAngle(from, p, snap.angleStepDeg);
  let kind: SnapKind = 'none';
  if (snap.enabled && !s.snapSuspended && !(from && s.constrain)) {
    const result = snapPoint(p, snapTargets(plan), {
      gridM: snap.grid ? grid.minorM : 0,
      vertices: snap.vertices,
      edges: snap.edges,
      toleranceM: 10 / s.view.zoom,
    });
    p = result.point;
    kind = result.kind;
  }
  return { point: roundPoint(clampToMap(p, w, h)), kind };
}

// ───────── Previews and readouts ─────────

/** The point that follows the user: the crosshair for keyboard users, else the pointer. */
export function livePoint(): Vec2 | null {
  const s = getState();
  return s.inputMode === 'keyboard' ? s.crosshair : (s.pointer ?? s.crosshair);
}

/** A rectangle from two opposite corners, or an ellipse from centre and a radius point. */
export function twoPointShape(
  mode: 'rect' | 'ellipse',
  a: Vec2,
  b: Vec2,
  constrain: boolean,
): Shape | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (mode === 'rect') {
    let w = Math.abs(dx);
    let h = Math.abs(dy);
    if (constrain) w = h = Math.max(w, h);
    if (w === 0 || h === 0) return null;
    const x = dx < 0 ? a.x - w : a.x;
    const y = dy < 0 ? a.y - h : a.y;
    return { kind: 'rect', x, y, w, h, rotationDeg: 0 };
  }
  const r = Math.hypot(dx, dy);
  if (r === 0) return null;
  if (constrain || dx === 0 || dy === 0)
    return { kind: 'ellipse', cx: a.x, cy: a.y, rx: r, ry: r, rotationDeg: 0 };
  return { kind: 'ellipse', cx: a.x, cy: a.y, rx: Math.abs(dx), ry: Math.abs(dy), rotationDeg: 0 };
}

export interface DraftPreview {
  kind: 'shape' | 'line' | 'point';
  mode: ShapeMode | null;
  points: Vec2[];
  shape: Shape | null;
  areaM2: number | null;
  perimeterM: number | null;
  lengthM: number | null;
}

/** What the user is drawing right now, including the moving point. */
export function draftPreview(): DraftPreview | null {
  const s = getState();
  const kind = toolKind(s.tool, s.options);
  if (kind === 'select') return null;
  const placed = s.draft?.points ?? [];
  const live = livePoint();
  const last = placed.at(-1);
  const liveSnapped = live
    ? s.inputMode === 'keyboard'
      ? live
      : snapForDrawing(live, last).point
    : null;
  const points = liveSnapped ? [...placed, liveSnapped] : placed;
  if (kind === 'point')
    return { kind, mode: null, points, shape: null, areaM2: null, perimeterM: null, lengthM: null };
  if (kind === 'line') {
    return {
      kind,
      mode: null,
      points,
      shape: null,
      areaM2: null,
      perimeterM: null,
      lengthM: polylineLength(points),
    };
  }
  const mode = shapeModeFor(s.tool, s.options);
  let shape: Shape | null = null;
  if ((mode === 'rect' || mode === 'ellipse') && points.length >= 2) {
    shape = twoPointShape(mode, points[0] as Vec2, points[1] as Vec2, s.constrain);
  } else if (mode !== 'rect' && mode !== 'ellipse' && points.length >= 3) {
    shape = { kind: 'polygon', points };
  }
  const poly = shape ? shapeToPoly(shape) : null;
  return {
    kind: 'shape',
    mode,
    points,
    shape,
    areaM2: poly ? polyArea(poly) : null,
    perimeterM: poly ? ringPerimeter(poly.outer) : null,
    lengthM: null,
  };
}

// ───────── Placing points ─────────

const xy = (p: Vec2) => [formatNumber(p.x, 1), formatNumber(p.y, 1)] as const;

function announcePoint(n: number, p: Vec2, snapKind: SnapKind): void {
  const [x, y] = xy(p);
  const parts = [t.draw.pointPlaced(n, x, y)];
  const units = getState().plan?.settings.units ?? 'metric';
  const preview = draftPreviewForPlaced();
  if (preview?.areaM2) parts.push(t.draw.areaSoFar(speakArea(preview.areaM2, units)));
  if (preview?.lengthM) parts.push(t.draw.lengthSoFar(speakLength(preview.lengthM, units)));
  if (snapKind !== 'none' && snapKind !== 'grid')
    parts.push(t.draw.snapped(t.draw.snapTargets[snapKind]));
  announce(parts.join(' '));
}

/** Area/length of only the placed points (for announcements). */
function draftPreviewForPlaced(): { areaM2: number | null; lengthM: number | null } | null {
  const s = getState();
  const pts = s.draft?.points ?? [];
  const kind = toolKind(s.tool, s.options);
  if (kind === 'line') return { areaM2: null, lengthM: polylineLength(pts) };
  if (kind === 'shape' && pts.length >= 3)
    return { areaM2: Math.abs(signedArea(pts)), lengthM: null };
  return null;
}

/** Places a point from the pointer or the keyboard crosshair. */
export function placePoint(raw: Vec2, source: 'pointer' | 'keyboard'): void {
  const s = getState();
  const plan = s.plan;
  if (!plan) return;
  const kind = toolKind(s.tool, s.options);
  if (kind === 'select') return;
  const placed = s.draft?.points ?? [];
  // The keyboard crosshair already moves in grid steps, so its points go exactly where it is
  // shown. Vertex and edge snapping (sized in screen pixels) is for pointer input only.
  const { point, kind: snapKind } =
    source === 'keyboard'
      ? {
          point: roundPoint(clampToMap(raw, plan.settings.mapWidthM, plan.settings.mapHeightM)),
          kind: 'none' as SnapKind,
        }
      : snapForDrawing(raw, placed.at(-1));

  if (kind === 'point') {
    createAtPoint(point);
    return;
  }

  // Pressing Enter (or clicking) on the last point again finishes the shape or line.
  const last = placed.at(-1);
  if (last && distance(last, point) < 1e-6) {
    finishDraft();
    return;
  }

  if (kind === 'shape') {
    const mode = shapeModeFor(s.tool, s.options);
    if (mode === 'rect' || mode === 'ellipse') {
      if (placed.length === 0) {
        setState({ draft: { points: [point] }, draftIssue: null });
        announcePoint(1, point, snapKind);
        return;
      }
      const shape = twoPointShape(mode, placed[0] as Vec2, point, s.constrain);
      if (!shape) return;
      setState({ draft: null });
      createFromShape(shape);
      return;
    }
    // Polygon / freehand-by-keyboard: clicking near the first point closes the shape.
    const first = placed[0];
    if (
      source === 'pointer' &&
      first &&
      placed.length >= 3 &&
      distance(first, point) <= 10 / s.view.zoom
    ) {
      finishDraft();
      return;
    }
  }
  const points = [...placed, point];
  setState({ draft: { points }, draftIssue: null });
  if (source === 'keyboard') revealPoint(point);
  announcePoint(points.length, point, snapKind);
}

export function removeLastPoint(): boolean {
  const draft = getState().draft;
  if (!draft || draft.points.length === 0) return false;
  const points = draft.points.slice(0, -1);
  setState({ draft: points.length > 0 ? { points } : null, draftIssue: null });
  announce(t.draw.pointRemoved(points.length));
  return true;
}

export function cancelDraft(): boolean {
  if (!getState().draft) return false;
  setState({ draft: null, draftIssue: null });
  announce(t.draw.cancelled);
  return true;
}

/** Finishes the current polygon or line (Enter, double-click, or clicking the first point). */
export function finishDraft(): void {
  const s = getState();
  const points = s.draft?.points ?? [];
  const kind = toolKind(s.tool, s.options);
  if (kind === 'line') {
    if (points.length < 2) {
      announce(t.draw.needTwoPoints);
      return;
    }
    setState({ draft: null, draftIssue: null });
    createFromLine(points);
    return;
  }
  if (kind !== 'shape') return;
  const check = checkRing(points);
  if (!check.ok) {
    setState({ draftIssue: check.edges ? { edges: check.edges } : {} });
    announce(
      check.problem === 'selfIntersects'
        ? t.draw.selfIntersects
        : check.problem === 'noArea'
          ? t.draw.noArea
          : t.draw.tooFewPoints,
      { assertive: false },
    );
    return;
  }
  setState({ draft: null, draftIssue: null });
  createFromShape({ kind: 'polygon', points });
}

/** Completes a freehand stroke: simplified (RDP, 0.5 m) into an editable polygon. */
export function finishFreehand(stroke: Vec2[]): void {
  const plan = getState().plan;
  if (!plan) return;
  const clamped = stroke.map((p) =>
    roundPoint(clampToMap(p, plan.settings.mapWidthM, plan.settings.mapHeightM)),
  );
  const points = simplify(clamped, 0.5);
  setState({ draft: { points } });
  finishDraft();
}

export function moveCrosshair(dx: number, dy: number): void {
  const s = getState();
  const plan = s.plan;
  if (!plan) return;
  const base = s.crosshair ?? { x: s.view.cx, y: s.view.cy };
  const next = roundPoint(
    clampToMap(
      { x: base.x + dx, y: base.y + dy },
      plan.settings.mapWidthM,
      plan.settings.mapHeightM,
    ),
  );
  setState({ crosshair: next, inputMode: 'keyboard' });
  revealPoint(next);
}

// ───────── Creating objects ─────────

function baseFields(plan: Plan, prefix: string) {
  return {
    id: newId(),
    name: nextName(plan.objects, prefix),
    phase: 1,
    locked: false,
    hidden: false,
  };
}

function announceCreated(o: MapObject, plan: Plan): void {
  const units = plan.settings.units;
  const fp = footprint(o);
  const mapM2 = plan.settings.mapWidthM * plan.settings.mapHeightM;
  if (
    o.type === 'path' ||
    o.type === 'barrier' ||
    (o.type === 'measure' && o.mode === 'distance')
  ) {
    const len = polylineLength('line' in o ? o.line.points : o.points);
    announce(
      o.type === 'measure'
        ? t.draw.measured(speakLength(len, units))
        : t.draw.createdLine(o.name, speakLength(len, units)),
    );
    return;
  }
  if (fp) {
    const area = fp.reduce((sum, p) => sum + polyArea(p), 0);
    announce(
      t.draw.created(
        o.name,
        speakArea(area, units),
        `${formatNumber((area / mapM2) * 100, 2)} percent`,
      ),
    );
    return;
  }
  if (o.type === 'measure') {
    announce(t.draw.measured(speakArea(Math.abs(signedArea(o.points)), units)));
    return;
  }
  announce(t.draw.createdPoint(o.name));
}

function finishCreate(o: MapObject): void {
  addObject(o);
  const plan = getState().plan;
  if (plan) announceCreated(o, plan);
  setState({ panelTab: 'inspector' });
}

function createFromShape(shape: Shape): void {
  const s = getState();
  const plan = s.plan;
  if (!plan) return;
  const o = s.options;
  switch (s.tool) {
    case 'habitat': {
      if (o.zoneTarget) {
        const hab = objectById(plan, o.zoneTarget.habitatId) as HabitatObject | undefined;
        if (hab) {
          addZone(hab.id, { id: newId(), kind: o.zoneTarget.kind, shape });
          announce(t.history.addZone(t.zones[o.zoneTarget.kind].toLowerCase(), hab.name));
          select([hab.id], { announce: false });
          return;
        }
      }
      finishCreate({
        ...baseFields(plan, t.habitatKinds[o.habitatKind]),
        type: 'habitat',
        kind: o.habitatKind,
        shape,
        zones: [],
        animals: [],
      });
      return;
    }
    case 'building': {
      const label = getBuildingType(o.buildingType)?.label ?? t.types.building;
      finishCreate({
        ...baseFields(plan, label),
        type: 'building',
        buildingType: o.buildingType,
        shape,
      });
      return;
    }
    case 'path':
      finishCreate({ ...baseFields(plan, t.types.plaza), type: 'plaza', shape });
      return;
    case 'water':
      finishCreate({
        ...baseFields(plan, o.waterDeep ? t.types.deepWater : t.types.water),
        type: 'water',
        shape,
        deep: o.waterDeep,
      });
      return;
    case 'planting':
      finishCreate({ ...baseFields(plan, t.types.planting), type: 'planting', shape });
      return;
    case 'measure': {
      const points = shapeToPoly(shape).outer;
      finishCreate({ ...baseFields(plan, t.types.measure), type: 'measure', mode: 'area', points });
      return;
    }
    default:
      return;
  }
}

function createFromLine(points: Vec2[]): void {
  const s = getState();
  const plan = s.plan;
  if (!plan) return;
  const o = s.options;
  if (s.tool === 'path') {
    const label = getPathType(o.pathType)?.label ?? t.types.path;
    finishCreate({
      ...baseFields(plan, label),
      type: 'path',
      pathType: o.pathType,
      line: { points, smooth: o.pathSmooth },
      widthM: o.pathWidthM,
      cap: o.pathCap,
    });
  } else if (s.tool === 'barrier') {
    const label = getBarrier(o.barrierId)?.label ?? t.types.barrier;
    finishCreate({
      ...baseFields(plan, label),
      type: 'barrier',
      barrierId: o.barrierId,
      line: { points, smooth: false },
    });
  } else if (s.tool === 'measure') {
    finishCreate({
      ...baseFields(plan, t.types.measure),
      type: 'measure',
      mode: 'distance',
      points,
    });
  }
}

function createAtPoint(at: Vec2): void {
  const s = getState();
  const plan = s.plan;
  if (!plan) return;
  const o = s.options;
  if (s.tool === 'icon') {
    const label = (t.facilities as Record<string, string>)[o.iconId] ?? t.types.icon;
    finishCreate({
      ...baseFields(plan, label),
      type: 'icon',
      iconId: o.iconId,
      at,
      sizing: o.iconSizing,
      sizeM: 6,
      rotationDeg: 0,
    });
  } else if (s.tool === 'label') {
    const text = o.labelText.trim() || t.types.label;
    finishCreate({
      ...baseFields(plan, t.types.label),
      name: text.slice(0, 60),
      type: 'label',
      text,
      at,
      sizing: 'screen',
      size: 16,
      rotationDeg: 0,
    });
  }
}

/** Suggested widths for the chosen path type (shown as a hint). */
export const pathWidthHint = (
  pathType: string,
): { min: number; max: number; source: string } | null => {
  const p = getPathType(pathType);
  return p
    ? { min: p.suggestedWidthRangeM[0], max: p.suggestedWidthRangeM[1], source: p.suggestionSource }
    : null;
};

export const WIDTH_LIMITS = OBJECT_TYPES.widthLimitsM;
