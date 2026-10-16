/**
 * Keyboard handling while the map has focus. Returns true when the key was used (the caller
 * then prevents the default). Tab is only used while there is another object to move to, so
 * focus can always leave the map (WCAG 2.1.2).
 */
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import { findShortcut, type ShortcutId } from '../a11y/shortcuts.ts';
import { formatNumber } from '../../lib/format.ts';
import { objectBBox, objectsBBox } from '../../model/objectGeometry.ts';
import type { MapObject } from '../../model/types.ts';
import {
  clearSelection,
  deleteSelection,
  duplicateSelection,
  mirrorSelection,
  moveSelection,
  objectById,
  reorderSelection,
  rotateSelection,
  scaleSelection,
  select,
  selectNext,
  setHidden,
  setLocked,
} from '../store/actions.ts';
import { getState, setState, type ToolId } from '../store/store.ts';
import { fitMap, panBy, revealBox, zoomBy, zoomToSelection } from '../store/view.ts';
import {
  cancelDraft,
  finishDraft,
  moveCrosshair,
  placePoint,
  removeLastPoint,
  setShapeMode,
  setTool,
} from '../tools/drawing.ts';
import { isDrawingTool } from '../tools/tools.ts';
import { deleteVertex, enterVertexMode, exitVertexMode, insertVertex, nextVertex, nudgeVertex } from './vertexMode.ts';

const t = en.planner;

export interface MapKeyContext {
  openContextMenu: () => void;
}

const TOOL_SHORTCUTS: Partial<Record<ShortcutId, ToolId>> = {
  toolSelect: 'select',
  toolHabitat: 'habitat',
  toolBuilding: 'building',
  toolPath: 'path',
  toolBarrier: 'barrier',
  toolWater: 'water',
  toolPlanting: 'planting',
  toolIcon: 'icon',
  toolLabel: 'label',
  toolMeasure: 'measure',
};

/** Step for arrows: one grid step, ×10 with Shift, 0.1 m with Alt. */
function arrowStep(e: KeyboardEvent): number {
  const grid = getState().plan?.settings.grid.minorM ?? 1;
  if (e.altKey) return 0.1;
  return e.shiftKey ? grid * 10 : grid;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

function whereAmI(): void {
  const s = getState();
  const plan = s.plan;
  if (isDrawingTool(s.tool) && s.crosshair) {
    announce(t.whereAmI.crosshair(formatNumber(s.crosshair.x, 1), formatNumber(s.crosshair.y, 1)));
    return;
  }
  const objs = plan ? plan.objects.filter((o) => s.selection.includes(o.id)) : [];
  const box = objectsBBox(objs);
  if (box && objs.length > 0) {
    const name = objs.length === 1 ? (objs[0] as MapObject).name : t.history.selection(objs.length);
    announce(
      t.whereAmI.selection(
        name,
        formatNumber(box.minX, 1),
        formatNumber(box.minY, 1),
        formatNumber(box.maxX - box.minX, 1),
        formatNumber(box.maxY - box.minY, 1),
      ),
    );
    return;
  }
  announce(t.whereAmI.nothing);
}

function revealSelection(): void {
  const { plan, selection } = getState();
  if (!plan) return;
  const o = selection[0] ? objectById(plan, selection[0]) : undefined;
  if (o) revealBox(objectBBox(o));
}

export function handleMapKey(e: KeyboardEvent, ctx: MapKeyContext): boolean {
  const s = getState();
  if (!s.plan) return false;
  const drawing = isDrawingTool(s.tool);
  const arrow = ARROWS[e.key];
  const mod = e.ctrlKey || e.metaKey;

  // ── Vertex edit mode ──
  if (s.vertexEdit) {
    if (e.key === 'Tab') {
      nextVertex(e.shiftKey ? -1 : 1);
      return true;
    }
    if (arrow && !mod) {
      const step = arrowStep(e);
      nudgeVertex(arrow[0] * step, arrow[1] * step);
      return true;
    }
    if (e.key === 'Insert' || (e.key === '+' && !mod)) {
      insertVertex();
      return true;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteVertex();
      return true;
    }
    if (e.key === 'Escape' || e.key === 'Enter') {
      exitVertexMode();
      return true;
    }
  }

  // ── Drawing tools ──
  if (drawing && !s.vertexEdit) {
    if (arrow && mod) {
      panBy(arrow[0] * s.view.width * 0.1, arrow[1] * s.view.height * 0.1);
      return true;
    }
    if (arrow) {
      const step = arrowStep(e);
      moveCrosshair(arrow[0] * step, arrow[1] * step);
      return true;
    }
    if (e.key === 'Enter' && !mod) {
      setState({ inputMode: 'keyboard' });
      if (s.crosshair) placePoint(s.crosshair, 'keyboard');
      return true;
    }
    if (e.key === 'Enter' && mod) {
      finishDraft();
      return true;
    }
    if (e.key === 'Backspace') return removeLastPoint();
    if (e.key === 'Escape') {
      if (cancelDraft()) return true;
      setTool('select');
      return true;
    }
  }

  // ── Select tool ──
  if (!drawing && !s.vertexEdit) {
    if (e.key === 'Tab' && !mod && !e.altKey) {
      const moved = selectNext(e.shiftKey ? -1 : 1);
      if (moved) revealSelection();
      return moved;
    }
    if (arrow && mod) {
      panBy(arrow[0] * s.view.width * 0.1, arrow[1] * s.view.height * 0.1);
      return true;
    }
    if (arrow) {
      if (s.selection.length === 0) {
        panBy(arrow[0] * s.view.width * 0.1, arrow[1] * s.view.height * 0.1);
        return true;
      }
      const step = arrowStep(e);
      moveSelection(arrow[0] * step, arrow[1] * step);
      revealSelection();
      return true;
    }
    if (e.key === 'Enter' && s.selection.length === 1) {
      enterVertexMode();
      return true;
    }
    if (e.key === 'Escape') {
      clearSelection();
      return true;
    }
  }

  // ── Shortcut registry ──
  const shortcut = findShortcut(e, {
    scope: 'map',
    singleKeysEnabled: s.prefs.singleKeyShortcuts,
    overrides: s.prefs.shortcutOverrides,
  });
  if (!shortcut) return false;
  const tool = TOOL_SHORTCUTS[shortcut.id];
  if (tool) {
    setTool(tool);
    return true;
  }
  switch (shortcut.id) {
    case 'shapePolygon':
      setShapeMode('polygon');
      return true;
    case 'shapeRect':
      setShapeMode('rect');
      return true;
    case 'shapeEllipse':
      setShapeMode('ellipse');
      return true;
    case 'shapeFreehand':
      setShapeMode('freehand');
      return true;
    case 'zoomIn':
      zoomBy(1.25);
      return true;
    case 'zoomOut':
      zoomBy(0.8);
      return true;
    case 'zoomFit':
      fitMap();
      return true;
    case 'zoomSelection':
      zoomToSelection();
      return true;
    case 'rotateLeft':
      rotateSelection(e.shiftKey ? -1 : -15);
      return true;
    case 'rotateRight':
      rotateSelection(e.shiftKey ? 1 : 15);
      return true;
    case 'shrink':
      scaleSelection(e.shiftKey ? 0.99 : 0.95);
      return true;
    case 'grow':
      scaleSelection(e.shiftKey ? 1.01 : 1.05);
      return true;
    case 'duplicate':
      duplicateSelection();
      return true;
    case 'deleteSelection':
      deleteSelection();
      return true;
    case 'selectAll':
      select(s.plan.objects.filter((o) => !o.hidden).map((o) => o.id));
      return true;
    case 'sendBackward':
      reorderSelection('backward');
      return true;
    case 'bringForward':
      reorderSelection('forward');
      return true;
    case 'sendToBack':
      reorderSelection('back');
      return true;
    case 'bringToFront':
      reorderSelection('front');
      return true;
    case 'mirrorH':
      mirrorSelection('h');
      return true;
    case 'mirrorV':
      mirrorSelection('v');
      return true;
    case 'lock': {
      const objs = s.plan.objects.filter((o) => s.selection.includes(o.id));
      setLocked(!objs.every((o) => o.locked));
      return true;
    }
    case 'hide': {
      const objs = s.plan.objects.filter((o) => s.selection.includes(o.id));
      setHidden(!objs.every((o) => o.hidden));
      return true;
    }
    case 'whereAmI':
      whereAmI();
      return true;
    case 'contextMenu':
      ctx.openContextMenu();
      return true;
    case 'shortcutsDialog':
      setState({ dialog: { id: 'shortcuts' } });
      return true;
    default:
      return false;
  }
}
