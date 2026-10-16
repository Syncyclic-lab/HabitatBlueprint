import { en } from '../../i18n/en.ts';
import type { Vec2 } from '../../geometry/types.ts';
import { midpoint, roundPoint } from '../../geometry/vec.ts';
import { fromMeters, toMeters, type Units } from '../../lib/format.ts';
import { NumberField } from '../ui/fields.tsx';
import { Icon } from '../ui/Icon.tsx';
import { ScrollRegion } from '../ui/ScrollRegion.tsx';

const t = en.planner.inspector;
const h = en.planner.history;

export interface PointsTableProps {
  /** Object name, for the caption and undo labels. */
  name: string;
  points: readonly Vec2[];
  /** Closed shapes need 3 points and wrap around; lines need 2. */
  closed: boolean;
  disabled?: boolean;
  units: Units;
  onChange: (points: Vec2[], label: string) => void;
}

/** The vertex table (docs/03 §2.4): every point as editable x/y fields, with add and remove. */
export function PointsTable({ name, points, closed, disabled, units, onChange }: PointsTableProps) {
  const min = closed ? 3 : 2;
  const unit = units === 'imperial' ? '(ft)' : '(m)';
  const set = (i: number, axis: 'x' | 'y', v: number) => {
    const next = points.map((p, j) =>
      j === i ? roundPoint({ ...p, [axis]: toMeters(v, units) }) : p,
    );
    onChange(next, h.editPoint(name));
  };
  const addAfter = (i: number) => {
    const a = points[i] as Vec2;
    const b = points[(i + 1) % points.length] as Vec2;
    const p = !closed && i === points.length - 1 ? { x: a.x + 5, y: a.y } : midpoint(a, b);
    onChange([...points.slice(0, i + 1), roundPoint(p), ...points.slice(i + 1)], h.addPoint(name));
  };
  const remove = (i: number) =>
    onChange(
      points.filter((_, j) => j !== i),
      h.removePoint(name),
    );

  return (
    <ScrollRegion label={t.pointsCaption(name)} className="points-wrap">
      <table className="data-table points-table">
        <caption>{t.pointsCaption(name)}</caption>
        <thead>
          <tr>
            <th scope="col">{t.points}</th>
            <th scope="col">x {unit}</th>
            <th scope="col">y {unit}</th>
            <th scope="col">
              <span className="visually-hidden">{en.planner.objects.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{i + 1}</th>
              <td>
                <NumberField
                  label={t.pointX(i + 1)}
                  labelHidden
                  value={fromMeters(p.x, units)}
                  disabled={disabled}
                  onCommit={(v) => set(i, 'x', v)}
                />
              </td>
              <td>
                <NumberField
                  label={t.pointY(i + 1)}
                  labelHidden
                  value={fromMeters(p.y, units)}
                  disabled={disabled}
                  onCommit={(v) => set(i, 'y', v)}
                />
              </td>
              <td>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={disabled}
                    aria-label={t.addPointAfter(i + 1)}
                    onClick={() => addAfter(i)}
                  >
                    <Icon id="plus" size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={disabled || points.length <= min}
                    aria-label={t.removePoint(i + 1)}
                    onClick={() => remove(i)}
                  >
                    <Icon id="minus" size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}
