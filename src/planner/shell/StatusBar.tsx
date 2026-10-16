import { en } from '../../i18n/en.ts';
import { formatArea, formatNumber, formatPercent } from '../../lib/format.ts';
import { usePlanTotals } from '../hooks/useTotals.ts';
import { updateSettings } from '../store/actions.ts';
import { usePlanner } from '../store/store.ts';
import { GRID_MIN_PX, zoomPercent } from '../map/viewMath.ts';
import { visibleGridStep } from '../../geometry/scale.ts';

const t = en.planner.status;

/**
 * Status bar (docs/03 §1). Not a live region: its numbers change constantly and would flood a
 * screen reader. Results are announced through the live region instead.
 */
export function StatusBar() {
  const plan = usePlanner((s) => s.plan);
  const pointer = usePlanner((s) => s.pointer);
  const crosshair = usePlanner((s) => s.crosshair);
  const inputMode = usePlanner((s) => s.inputMode);
  const view = usePlanner((s) => s.view);
  const suspended = usePlanner((s) => s.snapSuspended);
  const totals = usePlanTotals();
  if (!plan || !totals) return null;
  const units = plan.settings.units;
  const p = inputMode === 'keyboard' ? crosshair : pointer;
  const grid = plan.settings.grid;
  const drawnStep = grid.visible ? visibleGridStep(grid.minorM, view.zoom, GRID_MIN_PX) : null;
  const snapOn = plan.settings.snap.enabled;

  return (
    <section
      className="pl-status"
      data-region="status"
      aria-label={en.planner.regions.status}
      tabIndex={-1}
    >
      <div className="cell" data-wide="true">
        <span className="cell-label">{t.cursor}</span>
        {p ? (
          <span className="num">
            x {formatNumber(p.x, 1)} m, y {formatNumber(p.y, 1)} m
          </span>
        ) : (
          <span>{t.noCursor}</span>
        )}
      </div>
      <div className="cell" data-wide="true">
        <span className="cell-label">{t.zoom}</span>
        <span className="num">{zoomPercent(view)}%</span>
      </div>
      <div className="cell" data-wide="true">
        <span className="cell-label">{t.grid}</span>
        <span className="num">{drawnStep ? `${formatNumber(drawnStep)} m` : t.gridOff}</span>
      </div>
      <div className="cell" data-wide="true">
        <button
          type="button"
          className="btn btn-small"
          aria-pressed={snapOn}
          title={t.toggleSnap}
          onClick={() =>
            updateSettings((s) => {
              s.snap.enabled = !s.snap.enabled;
            })
          }
        >
          {t.snap}
          <span aria-hidden="true" className="snap-state">
            {suspended ? t.snapSuspended : snapOn ? t.snapOn : t.snapOff}
          </span>
        </button>
      </div>
      <div className="cell">
        <span className="cell-label">{t.map}</span>
        <span className="num">{formatArea(totals.mapM2, units)}</span>
      </div>
      <div className="cell">
        <span className="cell-label">{t.planned}</span>
        <span className="num">
          {t.plannedValue(
            formatArea(totals.plannedM2, units),
            formatPercent(totals.plannedM2 / totals.mapM2),
          )}
        </span>
      </div>
    </section>
  );
}
