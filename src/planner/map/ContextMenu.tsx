/**
 * The selection's context menu: a real menu (React Aria) opened by right-click, Shift+F10,
 * the Menu key or the ⋯ button (docs/03 §2.4).
 */
import { useRef } from 'react';
import { Menu, MenuItem, Popover, Separator, Keyboard } from 'react-aria-components';
import { en } from '../../i18n/en.ts';
import { formatKey } from '../a11y/shortcuts.ts';
import { getState, setState, usePlanner } from '../store/store.ts';
import {
  deleteSelection,
  duplicateSelection,
  mirrorSelection,
  reorderSelection,
  setHidden,
  setLocked,
} from '../store/actions.ts';
import { zoomToSelection } from '../store/view.ts';
import { enterVertexMode } from './vertexMode.ts';

const t = en.planner.actions;

export interface ContextMenuProps {
  /** Screen position (viewport pixels within the map) to open at. */
  at: { x: number; y: number } | null;
  onClose: () => void;
}

type ActionKey =
  | 'duplicate'
  | 'delete'
  | 'mirrorH'
  | 'mirrorV'
  | 'forward'
  | 'backward'
  | 'front'
  | 'back'
  | 'lock'
  | 'hide'
  | 'zoomTo'
  | 'editPoints'
  | 'resizeToArea'
  | 'moveBy';

export function ContextMenu({ at, onClose }: ContextMenuProps) {
  const anchor = useRef<HTMLDivElement>(null);
  const selection = usePlanner((s) => s.selection);
  const plan = usePlanner((s) => s.plan);
  const objects = plan?.objects.filter((o) => selection.includes(o.id)) ?? [];
  const single = objects.length === 1 ? objects[0] : undefined;
  const allLocked = objects.length > 0 && objects.every((o) => o.locked);
  const allHidden = objects.length > 0 && objects.every((o) => o.hidden);
  const canResize = single && ('shape' in single) && !single.locked;

  const run = (key: ActionKey) => {
    onClose();
    switch (key) {
      case 'duplicate':
        return duplicateSelection();
      case 'delete':
        return deleteSelection();
      case 'mirrorH':
        return mirrorSelection('h');
      case 'mirrorV':
        return mirrorSelection('v');
      case 'forward':
        return reorderSelection('forward');
      case 'backward':
        return reorderSelection('backward');
      case 'front':
        return reorderSelection('front');
      case 'back':
        return reorderSelection('back');
      case 'lock':
        return setLocked(!allLocked);
      case 'hide':
        return setHidden(!allHidden);
      case 'zoomTo':
        return zoomToSelection();
      case 'editPoints':
        return enterVertexMode();
      case 'resizeToArea':
        if (single) setState({ dialog: { id: 'resizeToArea', objectId: single.id } });
        return undefined;
      case 'moveBy':
        setState({ dialog: { id: 'moveBy' } });
        return undefined;
    }
  };

  const item = (key: ActionKey, label: string, combo?: string, disabled = false) => (
    <MenuItem id={key} className="pl-menu-item" textValue={label} isDisabled={disabled}>
      <span>{label}</span>
      {combo && <Keyboard>{formatKey(combo)}</Keyboard>}
    </MenuItem>
  );

  return (
    <>
      {/* React sets style through the CSSOM, which our CSP allows (no style="" attribute). */}
      <div
        ref={anchor}
        className="map-overlay"
        aria-hidden="true"
        style={{ left: at?.x ?? 0, top: at?.y ?? 0, width: 1, height: 1 }}
      />
      <Popover
        triggerRef={anchor}
        isOpen={at !== null && objects.length > 0}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        placement="bottom start"
        className="pl-popover"
      >
        <Menu aria-label={en.planner.menu.label} className="pl-menu" onAction={(key) => run(key as ActionKey)} autoFocus="first">
          {item('duplicate', t.duplicate, 'Mod+d', allLocked)}
          {item('delete', t.delete, 'Delete', allLocked)}
          <Separator className="pl-menu-sep" />
          {item('resizeToArea', t.resizeToArea, undefined, !canResize)}
          {item('moveBy', t.moveBy, undefined, allLocked)}
          {item('editPoints', t.editPoints, 'Enter', !single || single.locked)}
          {item('mirrorH', t.mirrorH, 'Shift+h', allLocked)}
          {item('mirrorV', t.mirrorV, 'Shift+v', allLocked)}
          <Separator className="pl-menu-sep" />
          {item('forward', t.bringForward, 'Mod+]')}
          {item('backward', t.sendBackward, 'Mod+[')}
          {item('front', t.bringToFront, 'Mod+Shift+]')}
          {item('back', t.sendToBack, 'Mod+Shift+[')}
          <Separator className="pl-menu-sep" />
          {item('lock', allLocked ? t.unlock : t.lock, 'Mod+l')}
          {item('hide', allHidden ? t.show : t.hide, 'Mod+Shift+h')}
          {item('zoomTo', t.zoomTo, 'Shift+@')}
        </Menu>
      </Popover>
    </>
  );
}

/** Whether a context menu can open: something is selected. */
export const canOpenContextMenu = (): boolean => getState().selection.length > 0;
