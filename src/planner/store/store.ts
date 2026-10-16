/**
 * The planner store (Zustand, vanilla so it also works outside React and in tests).
 * The plan itself is only changed through commit()/transactions in history.ts, which record
 * a labelled undo step for each change.
 */
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { OBJECT_TYPES, BARRIERS } from '../../data/index.ts';
import type { ShortcutOverrides } from '../a11y/shortcuts.ts';
import type { HabitatKind, Id, Plan, Vec2, ZoneKind } from '../../model/types.ts';
import type { PlanFile } from '../../model/schema.ts';

export type ToolId =
  | 'select'
  | 'habitat'
  | 'building'
  | 'path'
  | 'barrier'
  | 'water'
  | 'planting'
  | 'icon'
  | 'label'
  | 'measure';

export type ShapeMode = 'polygon' | 'rect' | 'ellipse' | 'freehand';
export type PanelTab = 'inspector' | 'objects' | 'areas' | 'stats' | 'checks';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unavailable';

export interface ToolOptions {
  habitatKind: HabitatKind;
  shapeMode: ShapeMode;
  buildingType: string;
  pathType: string;
  pathWidthM: number;
  pathMode: 'line' | 'area';
  pathSmooth: boolean;
  pathCap: 'round' | 'flat';
  barrierId: string;
  waterDeep: boolean;
  iconId: string;
  iconSizing: 'screen' | 'map';
  labelText: string;
  measureMode: 'distance' | 'area';
  /** When set, the habitat tool draws a zone inside this habitat instead of a new habitat. */
  zoneTarget: { habitatId: Id; kind: ZoneKind } | null;
}

export interface ViewState {
  /** Map coordinates (m) at the centre of the viewport. */
  cx: number;
  cy: number;
  /** Screen pixels per meter. */
  zoom: number;
  /** Viewport size in CSS pixels. */
  width: number;
  height: number;
}

export interface Draft {
  /** Points placed so far (meters). */
  points: Vec2[];
}

export interface VertexEdit {
  objectId: Id;
  zoneId: Id | null;
  index: number;
}

export type DialogState =
  | { id: 'newPlan'; firstRun?: boolean }
  | { id: 'addBySize' }
  | { id: 'resizeToArea'; objectId: Id; zoneId?: Id }
  | { id: 'moveBy' }
  | { id: 'mapSettings' }
  | { id: 'shortcuts' }
  | { id: 'export' }
  | { id: 'plans' }
  | { id: 'deleteAll' }
  | { id: 'openFile'; file: PlanFile; source: 'file' | 'link' }
  | { id: 'species'; focusId?: Id }
  | { id: 'templates' }
  | { id: 'snapshots' }
  | { id: 'tracing' }
  | { id: 'rename' };

export interface Prefs {
  singleKeyShortcuts: boolean;
  shortcutOverrides: ShortcutOverrides;
  theme: 'system' | 'light' | 'dark';
  showMinimap: boolean;
  lastPlanId: Id | null;
}

export interface PlannerState {
  plan: Plan | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  txn: { label: string; base: Plan } | null;
  view: ViewState;
  tool: ToolId;
  options: ToolOptions;
  draft: Draft | null;
  /** Keyboard crosshair position (meters), shown while a drawing tool is active on the map. */
  crosshair: Vec2 | null;
  /** Last pointer position over the map (meters), for the status bar. */
  pointer: Vec2 | null;
  selection: Id[];
  vertexEdit: VertexEdit | null;
  prefs: Prefs;
  dialog: DialogState | null;
  panelTab: PanelTab;
  saveStatus: SaveStatus;
  /** True while Alt is held: snapping is suspended. */
  snapSuspended: boolean;
  /** Which input moved last: decides whether the pointer or the crosshair drives previews. */
  inputMode: 'pointer' | 'keyboard';
  /** Why the current draft can't be finished, and which edges to highlight. */
  draftIssue: { edges?: [number, number] } | null;
  /** True while the user holds Shift (square rectangles, circles, angle steps). */
  constrain: boolean;
  /** Blob URL of the tracing image, if one is loaded. */
  tracingUrl: string | null;
  /** A plan was just opened: fit it to the view as soon as the viewport has a size. */
  fitPending: boolean;
  /** True once the map viewport has been measured. */
  viewportMeasured: boolean;
}

export interface HistoryEntry {
  label: string;
  before: Plan;
  after: Plan;
  selectionBefore: Id[];
  selectionAfter: Id[];
}

export const MAX_HISTORY = 500;
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 40;

export const DEFAULT_PREFS: Prefs = {
  singleKeyShortcuts: true,
  shortcutOverrides: {},
  theme: 'system',
  showMinimap: true,
  lastPlanId: null,
};

export function defaultOptions(): ToolOptions {
  const guest = OBJECT_TYPES.pathTypes[0];
  return {
    habitatKind: 'habitat',
    shapeMode: 'polygon',
    buildingType: OBJECT_TYPES.buildingTypes[0]?.id ?? 'other',
    pathType: guest?.id ?? 'guest',
    pathWidthM: guest?.defaultWidthM ?? 4,
    pathMode: 'line',
    pathSmooth: false,
    pathCap: 'round',
    barrierId: BARRIERS.barriers[0]?.id ?? 'hedge',
    waterDeep: false,
    iconId: 'restroom',
    iconSizing: 'screen',
    labelText: '',
    measureMode: 'distance',
    zoneTarget: null,
  };
}

export function initialState(): PlannerState {
  return {
    plan: null,
    past: [],
    future: [],
    txn: null,
    view: { cx: 500, cy: 500, zoom: 0.8, width: 800, height: 600 },
    tool: 'select',
    options: defaultOptions(),
    draft: null,
    crosshair: null,
    pointer: null,
    selection: [],
    vertexEdit: null,
    prefs: { ...DEFAULT_PREFS },
    dialog: null,
    panelTab: 'inspector',
    saveStatus: 'idle',
    snapSuspended: false,
    inputMode: 'pointer',
    draftIssue: null,
    constrain: false,
    tracingUrl: null,
    fitPending: true,
    viewportMeasured: false,
  };
}

export const plannerStore = createStore<PlannerState>()(() => initialState());

export const getState = plannerStore.getState;
export const setState = plannerStore.setState;

/** React hook: subscribe to a slice of planner state. */
export function usePlanner<T>(selector: (s: PlannerState) => T): T {
  return useStore(plannerStore, selector);
}
