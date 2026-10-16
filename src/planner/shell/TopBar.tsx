import { Button, Menu, MenuItem, MenuTrigger, Popover, Separator } from 'react-aria-components';
import { en } from '../../i18n/en.ts';
import { getBiome } from '../../data/index.ts';
import { redo, undo } from '../store/history.ts';
import { getState, setState, usePlanner, type DialogState } from '../store/store.ts';
import { announce } from '../a11y/announcer.ts';
import { Icon } from '../ui/Icon.tsx';

const t = en.planner.top;

type PlanAction =
  | 'newPlan'
  | 'plans'
  | 'rename'
  | 'saveFile'
  | 'openFile'
  | 'species'
  | 'snapshots'
  | 'templates'
  | 'tracing'
  | 'deleteAll';

export interface TopBarProps {
  /** Opens the native file picker for a plan file. */
  onOpenFile: () => void;
}

/** The planner's top bar: plan name, plan menu, undo/redo, save status and global actions. */
export function TopBar({ onOpenFile }: TopBarProps) {
  const plan = usePlanner((s) => s.plan);
  const past = usePlanner((s) => s.past);
  const future = usePlanner((s) => s.future);
  const status = usePlanner((s) => s.saveStatus);
  if (!plan) return null;
  const lastUndo = past.at(-1);
  const nextRedo = future[0];
  const biome = getBiome(plan.settings.biomeId)?.label ?? '';
  const mode =
    plan.settings.mode === 'sandbox' ? en.planner.newPlan.sandbox : en.planner.newPlan.franchise;

  const runPlanAction = (key: PlanAction) => {
    if (key === 'saveFile') {
      void import('../persistence/file.ts').then(({ savePlanFile }) => {
        const name = savePlanFile(getState().plan ?? plan);
        announce(en.planner.export.done(name));
      });
      return;
    }
    if (key === 'openFile') {
      onOpenFile();
      return;
    }
    setState({ dialog: { id: key } as DialogState });
  };

  const statusText =
    status === 'saving'
      ? t.saving
      : status === 'saved'
        ? t.saved
        : status === 'error'
          ? t.saveError
          : status === 'unavailable'
            ? t.unavailable
            : t.notSaved;

  return (
    <header className="pl-top" data-region="top" aria-label={en.planner.regions.topBar}>
      <MenuTrigger>
        <Button className="btn" aria-label={t.planMenu}>
          <Icon id="menu" />
          <span className="hide-narrow">{t.planMenu}</span>
        </Button>
        <Popover className="pl-popover" placement="bottom start">
          <Menu className="pl-menu" onAction={(k) => runPlanAction(k as PlanAction)}>
            <MenuItem id="newPlan" className="pl-menu-item">
              {t.newPlan}
            </MenuItem>
            <MenuItem id="plans" className="pl-menu-item">
              {t.plans}
            </MenuItem>
            <MenuItem id="rename" className="pl-menu-item">
              {t.rename}
            </MenuItem>
            <Separator className="pl-menu-sep" />
            <MenuItem id="saveFile" className="pl-menu-item">
              {t.saveFile}
            </MenuItem>
            <MenuItem id="openFile" className="pl-menu-item">
              {t.openFile}
            </MenuItem>
            <Separator className="pl-menu-sep" />
            <MenuItem id="templates" className="pl-menu-item">
              {t.templates}
            </MenuItem>
            <MenuItem id="species" className="pl-menu-item">
              {t.species}
            </MenuItem>
            <MenuItem id="snapshots" className="pl-menu-item">
              {t.snapshots}
            </MenuItem>
            <MenuItem id="tracing" className="pl-menu-item">
              {t.tracing}
            </MenuItem>
            <Separator className="pl-menu-sep" />
            <MenuItem id="deleteAll" className="pl-menu-item">
              {t.deleteAll}
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>

      <div className="plan-title">
        <h1 className="plan-name">{plan.name}</h1>
        <span className="plan-meta">
          {mode} · {biome}
        </span>
      </div>

      <div className="group" role="group" aria-label={`${t.undo} / ${t.redo}`}>
        <button
          type="button"
          className="btn"
          onClick={undo}
          aria-disabled={lastUndo ? undefined : 'true'}
          aria-label={lastUndo ? t.undoNamed(lastUndo.label) : t.undo}
          title={lastUndo ? t.undoNamed(lastUndo.label) : t.undo}
        >
          <Icon id="undo" />
          <span className="hide-narrow">{t.undo}</span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={redo}
          aria-disabled={nextRedo ? undefined : 'true'}
          aria-label={nextRedo ? t.redoNamed(nextRedo.label) : t.redo}
          title={nextRedo ? t.redoNamed(nextRedo.label) : t.redo}
        >
          <Icon id="redo" />
          <span className="hide-narrow">{t.redo}</span>
        </button>
      </div>

      <span className="save-status" data-state={status}>
        {status === 'saved' && <Icon id="check" size={16} />}
        {(status === 'error' || status === 'unavailable') && <Icon id="warning" size={16} />}
        {statusText}
      </span>

      <div className="group">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setState({ dialog: { id: 'export' } })}
        >
          <Icon id="share" />
          {t.export}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setState({ dialog: { id: 'mapSettings' } })}
        >
          <Icon id="settings" />
          <span className="hide-narrow">{t.mapSettings}</span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setState({ dialog: { id: 'shortcuts' } })}
          aria-label={t.shortcuts}
          title={t.shortcuts}
        >
          <Icon id="question" />
        </button>
      </div>
    </header>
  );
}
