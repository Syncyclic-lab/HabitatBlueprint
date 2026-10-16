import { en } from '../../i18n/en.ts';
import { objectBBox, objectsBBox, translateObject } from '../../model/objectGeometry.ts';
import type { MapObject } from '../../model/types.ts';
import { deleteSelection, duplicateSelection, setAreaFor } from '../store/actions.ts';
import { commit } from '../store/history.ts';
import { getState, usePlanner } from '../store/store.ts';
import { SelectField } from '../ui/fields.tsx';

const t = en.planner;

type Align = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distH' | 'distV';

/** Aligns or distributes the selection (docs/03 §3.14), as one undo step. */
export function alignSelection(how: Align): void {
  const { plan, selection } = getState();
  if (!plan) return;
  const objs = plan.objects.filter((o) => selection.includes(o.id) && !o.locked);
  const all = objectsBBox(objs);
  if (!all || objs.length < 2) return;
  const moved = new Map<string, MapObject>();
  if (how === 'distH' || how === 'distV') {
    const horizontal = how === 'distH';
    const sorted = [...objs].sort((a, b) => {
      const ba = objectBBox(a);
      const bb = objectBBox(b);
      return horizontal ? ba.minX - bb.minX : ba.minY - bb.minY;
    });
    const sizes = sorted.map((o) => {
      const b = objectBBox(o);
      return horizontal ? b.maxX - b.minX : b.maxY - b.minY;
    });
    const span = horizontal ? all.maxX - all.minX : all.maxY - all.minY;
    const gap = (span - sizes.reduce((s, x) => s + x, 0)) / (sorted.length - 1);
    let cursor = horizontal ? all.minX : all.minY;
    sorted.forEach((o, i) => {
      const b = objectBBox(o);
      const d = cursor - (horizontal ? b.minX : b.minY);
      moved.set(o.id, translateObject(o, horizontal ? d : 0, horizontal ? 0 : d));
      cursor += (sizes[i] ?? 0) + gap;
    });
  } else {
    for (const o of objs) {
      const b = objectBBox(o);
      let dx = 0;
      let dy = 0;
      if (how === 'left') dx = all.minX - b.minX;
      if (how === 'right') dx = all.maxX - b.maxX;
      if (how === 'center') dx = (all.minX + all.maxX) / 2 - (b.minX + b.maxX) / 2;
      if (how === 'top') dy = all.minY - b.minY;
      if (how === 'bottom') dy = all.maxY - b.maxY;
      if (how === 'middle') dy = (all.minY + all.maxY) / 2 - (b.minY + b.maxY) / 2;
      moved.set(o.id, translateObject(o, dx, dy));
    }
  }
  commit(t.history.align, (d) => {
    d.objects = d.objects.map((o) => (moved.get(o.id) as typeof o | undefined) ?? o);
  });
}

export function MultiSelection() {
  const plan = usePlanner((s) => s.plan);
  const selection = usePlanner((s) => s.selection);
  if (!plan) return null;
  const a = t.actions;
  const buttons: [Align, string][] = [
    ['left', a.alignLeft],
    ['center', a.alignCenter],
    ['right', a.alignRight],
    ['top', a.alignTop],
    ['middle', a.alignMiddle],
    ['bottom', a.alignBottom],
    ['distH', a.distributeH],
    ['distV', a.distributeV],
  ];
  const areaIds = new Set(
    plan.objects.filter((o) => selection.includes(o.id)).map((o) => o.areaId ?? ''),
  );
  const sharedArea = areaIds.size === 1 ? ([...areaIds][0] ?? '') : '';
  return (
    <>
      <h2>{t.inspector.many(selection.length)}</h2>
      <section className="panel-section" aria-labelledby="multi-actions">
        <h3 id="multi-actions">{t.inspector.multiActions}</h3>
        <div className="inline-actions">
          {buttons.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="btn btn-small"
              onClick={() => alignSelection(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <SelectField
          label={t.inspector.area}
          value={sharedArea}
          options={[
            { value: '', label: t.inspector.noArea },
            ...plan.areas.map((ar) => ({ value: ar.id, label: ar.name })),
          ]}
          onChange={(v) => setAreaFor(v || undefined)}
        />
        <div className="inline-actions">
          <button type="button" className="btn btn-small" onClick={() => duplicateSelection()}>
            {a.duplicate}
          </button>
          <button
            type="button"
            className="btn btn-small btn-danger"
            onClick={() => deleteSelection()}
          >
            {a.delete}
          </button>
        </div>
      </section>
    </>
  );
}
