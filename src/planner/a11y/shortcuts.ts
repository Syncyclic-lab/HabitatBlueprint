/**
 * The keyboard shortcut registry: one source for the planner's key handling, the in-app
 * shortcuts dialog and the Help page. Labels live in en.shortcuts.
 *
 * Key notation: "Mod" is Ctrl (⌘ on macOS). Keys are KeyboardEvent.key values, matched
 * case-insensitively for letters. Single-character shortcuts only work while the map has focus
 * and can be turned off or remapped (WCAG 2.1.4).
 */
export type ShortcutScope = 'map' | 'global';

export type ShortcutId =
  | 'toolSelect'
  | 'toolHabitat'
  | 'toolBuilding'
  | 'toolPath'
  | 'toolBarrier'
  | 'toolWater'
  | 'toolPlanting'
  | 'toolIcon'
  | 'toolLabel'
  | 'toolMeasure'
  | 'shapePolygon'
  | 'shapeRect'
  | 'shapeEllipse'
  | 'shapeFreehand'
  | 'placePoint'
  | 'cancel'
  | 'removeLastPoint'
  | 'moveCursor'
  | 'moveCursorFar'
  | 'moveCursorFine'
  | 'pan'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomFit'
  | 'zoomSelection'
  | 'rotateLeft'
  | 'rotateRight'
  | 'shrink'
  | 'grow'
  | 'undo'
  | 'redo'
  | 'duplicate'
  | 'deleteSelection'
  | 'selectAll'
  | 'nextObject'
  | 'sendBackward'
  | 'bringForward'
  | 'sendToBack'
  | 'bringToFront'
  | 'mirrorH'
  | 'mirrorV'
  | 'lock'
  | 'hide'
  | 'whereAmI'
  | 'contextMenu'
  | 'nextRegion'
  | 'previousRegion'
  | 'shortcutsDialog'
  | 'suspendSnap';

export interface Shortcut {
  id: ShortcutId;
  /** Default key combination(s); the first is shown in menus. */
  keys: readonly string[];
  scope: ShortcutScope;
  /** A single printable character with no modifier: can be disabled or remapped (WCAG 2.1.4). */
  single: boolean;
  /** Shown in docs only; handled as part of another interaction (e.g. arrows). */
  descriptive?: boolean;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { id: 'toolSelect', keys: ['v'], scope: 'map', single: true },
  { id: 'toolHabitat', keys: ['h'], scope: 'map', single: true },
  { id: 'toolBuilding', keys: ['b'], scope: 'map', single: true },
  { id: 'toolPath', keys: ['p'], scope: 'map', single: true },
  { id: 'toolBarrier', keys: ['f'], scope: 'map', single: true },
  { id: 'toolWater', keys: ['w'], scope: 'map', single: true },
  { id: 'toolPlanting', keys: ['g'], scope: 'map', single: true },
  { id: 'toolIcon', keys: ['i'], scope: 'map', single: true },
  { id: 'toolLabel', keys: ['t'], scope: 'map', single: true },
  { id: 'toolMeasure', keys: ['m'], scope: 'map', single: true },
  { id: 'shapePolygon', keys: ['1'], scope: 'map', single: true },
  { id: 'shapeRect', keys: ['2'], scope: 'map', single: true },
  { id: 'shapeEllipse', keys: ['3'], scope: 'map', single: true },
  { id: 'shapeFreehand', keys: ['4'], scope: 'map', single: true },
  { id: 'placePoint', keys: ['Enter', ' '], scope: 'map', single: false, descriptive: true },
  { id: 'cancel', keys: ['Escape'], scope: 'map', single: false, descriptive: true },
  { id: 'removeLastPoint', keys: ['Backspace'], scope: 'map', single: false, descriptive: true },
  { id: 'moveCursor', keys: ['ArrowUp'], scope: 'map', single: false, descriptive: true },
  { id: 'moveCursorFar', keys: ['Shift+ArrowUp'], scope: 'map', single: false, descriptive: true },
  { id: 'moveCursorFine', keys: ['Alt+ArrowUp'], scope: 'map', single: false, descriptive: true },
  { id: 'pan', keys: ['Mod+ArrowUp'], scope: 'map', single: false, descriptive: true },
  { id: 'zoomIn', keys: ['+', '='], scope: 'map', single: true },
  { id: 'zoomOut', keys: ['-'], scope: 'map', single: true },
  { id: 'zoomFit', keys: ['0'], scope: 'map', single: true },
  { id: 'zoomSelection', keys: ['Shift+@', 'Shift+2'], scope: 'map', single: false },
  { id: 'rotateLeft', keys: ['['], scope: 'map', single: true },
  { id: 'rotateRight', keys: [']'], scope: 'map', single: true },
  { id: 'shrink', keys: [','], scope: 'map', single: true },
  { id: 'grow', keys: ['.'], scope: 'map', single: true },
  { id: 'undo', keys: ['Mod+z'], scope: 'global', single: false },
  { id: 'redo', keys: ['Mod+Shift+z', 'Mod+y'], scope: 'global', single: false },
  { id: 'duplicate', keys: ['Mod+d'], scope: 'map', single: false },
  { id: 'deleteSelection', keys: ['Delete', 'Backspace'], scope: 'map', single: false },
  { id: 'selectAll', keys: ['Mod+a'], scope: 'map', single: false },
  { id: 'nextObject', keys: ['Tab'], scope: 'map', single: false, descriptive: true },
  { id: 'sendBackward', keys: ['Mod+['], scope: 'map', single: false },
  { id: 'bringForward', keys: ['Mod+]'], scope: 'map', single: false },
  { id: 'sendToBack', keys: ['Mod+Shift+['], scope: 'map', single: false },
  { id: 'bringToFront', keys: ['Mod+Shift+]'], scope: 'map', single: false },
  { id: 'mirrorH', keys: ['Shift+h'], scope: 'map', single: false },
  { id: 'mirrorV', keys: ['Shift+v'], scope: 'map', single: false },
  { id: 'lock', keys: ['Mod+l'], scope: 'map', single: false },
  { id: 'hide', keys: ['Mod+Shift+h'], scope: 'map', single: false },
  { id: 'whereAmI', keys: ['Mod+i'], scope: 'map', single: false },
  { id: 'contextMenu', keys: ['Shift+F10', 'ContextMenu'], scope: 'map', single: false },
  { id: 'nextRegion', keys: ['F6'], scope: 'global', single: false },
  { id: 'previousRegion', keys: ['Shift+F6'], scope: 'global', single: false },
  { id: 'shortcutsDialog', keys: ['?'], scope: 'map', single: true },
  { id: 'suspendSnap', keys: ['Alt'], scope: 'map', single: false, descriptive: true },
];

const KEY_NAMES: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'Arrow keys',
  Escape: 'Esc',
  Delete: 'Delete',
  Backspace: 'Backspace',
  ContextMenu: 'Menu key',
  Enter: 'Enter',
  Tab: 'Tab',
};

/** Human-readable key combination, e.g. "Ctrl+Shift+Z". `mac` swaps Ctrl/Alt for ⌘/⌥. */
export function formatKey(combo: string, mac = false): string {
  const parts = combo === '+' ? ['+'] : combo.split(/\+(?!$)/);
  return parts
    .map((p) => {
      if (p === 'Mod') return mac ? '⌘' : 'Ctrl';
      if (p === 'Alt') return mac ? '⌥' : 'Alt';
      if (p === 'Shift') return 'Shift';
      if (KEY_NAMES[p]) return KEY_NAMES[p];
      return p.length === 1 ? p.toUpperCase() : p;
    })
    .join(mac ? '' : '+');
}

/** Formats all key alternatives, e.g. "Ctrl+Shift+Z or Ctrl+Y". */
export function formatKeys(keys: readonly string[], mac = false): string {
  return keys.map((k) => formatKey(k, mac)).join(' or ');
}

export interface ParsedCombo {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

export function parseCombo(combo: string): ParsedCombo {
  const parts = combo === '+' ? ['+'] : combo.split(/\+(?!$)/);
  const key = parts[parts.length - 1] ?? '';
  return {
    key: key.length === 1 ? key.toLowerCase() : key,
    mod: parts.includes('Mod'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
  };
}

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * True if the event matches the combo. For single printable characters, Shift is ignored when
 * the combo doesn't mention it, because Shift is how some layouts type "?", "+" or "@".
 */
export function matchesCombo(event: KeyLike, combo: string): boolean {
  const c = parseCombo(combo);
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const mod = event.ctrlKey || event.metaKey;
  if (key !== c.key) return false;
  if (mod !== c.mod) return false;
  if (event.altKey !== c.alt) return false;
  const printable = c.key.length === 1 && !/[a-z0-9]/.test(c.key);
  if (!printable && event.shiftKey !== c.shift) return false;
  if (printable && c.shift && !event.shiftKey) return false;
  return true;
}

export type ShortcutOverrides = Partial<Record<ShortcutId, string>>;

/** Finds the shortcut for an event, honouring user remaps and the single-key switch. */
export function findShortcut(
  event: KeyLike,
  options: { scope: ShortcutScope; singleKeysEnabled: boolean; overrides?: ShortcutOverrides },
): Shortcut | undefined {
  for (const s of SHORTCUTS) {
    if (s.descriptive) continue;
    if (s.scope === 'map' && options.scope !== 'map') continue;
    if (s.single && !options.singleKeysEnabled) continue;
    const override = options.overrides?.[s.id];
    const keys = override ? [override] : s.keys;
    if (keys.some((k) => matchesCombo(event, k))) return s;
  }
  return undefined;
}
