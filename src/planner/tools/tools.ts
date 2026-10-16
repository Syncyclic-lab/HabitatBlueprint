/** Tool definitions: what each tool draws and how it's labelled. */
import { en } from '../../i18n/en.ts';
import type { IconId } from '../../assets/icons/icons.ts';
import type { ShapeMode, ToolId, ToolOptions } from '../store/store.ts';
import type { ShortcutId } from '../a11y/shortcuts.ts';

export type ToolKind = 'select' | 'shape' | 'line' | 'point';

export interface ToolDef {
  id: ToolId;
  label: string;
  icon: IconId;
  shortcut: ShortcutId;
}

const t = en.planner.tools;

export const TOOLS: readonly ToolDef[] = [
  { id: 'select', label: t.select, icon: 'tool-select', shortcut: 'toolSelect' },
  { id: 'habitat', label: t.habitat, icon: 'tool-habitat', shortcut: 'toolHabitat' },
  { id: 'building', label: t.building, icon: 'tool-building', shortcut: 'toolBuilding' },
  { id: 'path', label: t.path, icon: 'tool-path', shortcut: 'toolPath' },
  { id: 'barrier', label: t.barrier, icon: 'tool-barrier', shortcut: 'toolBarrier' },
  { id: 'water', label: t.water, icon: 'tool-water', shortcut: 'toolWater' },
  { id: 'planting', label: t.planting, icon: 'tool-planting', shortcut: 'toolPlanting' },
  { id: 'icon', label: t.icon, icon: 'tool-icon', shortcut: 'toolIcon' },
  { id: 'label', label: t.label, icon: 'tool-label', shortcut: 'toolLabel' },
  { id: 'measure', label: t.measure, icon: 'tool-measure', shortcut: 'toolMeasure' },
];

export const toolDef = (id: ToolId): ToolDef => TOOLS.find((d) => d.id === id) as ToolDef;

/** How a tool collects points, given its current options. */
export function toolKind(tool: ToolId, o: ToolOptions): ToolKind {
  switch (tool) {
    case 'select':
      return 'select';
    case 'path':
      return o.pathMode === 'area' ? 'shape' : 'line';
    case 'barrier':
      return 'line';
    case 'measure':
      return o.measureMode === 'area' ? 'shape' : 'line';
    case 'icon':
    case 'label':
      return 'point';
    default:
      return 'shape';
  }
}

/** Measure areas are always polygons; other shape tools use the chosen shape mode. */
export function shapeModeFor(tool: ToolId, o: ToolOptions): ShapeMode {
  return tool === 'measure' ? 'polygon' : o.shapeMode;
}

export const isDrawingTool = (tool: ToolId): boolean => tool !== 'select';
