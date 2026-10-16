import { useEffect, useState } from 'react';
import { en } from '../../i18n/en.ts';
import { formatArea } from '../../lib/format.ts';
import { runChecks, type PlanCheck } from '../../model/checks.ts';
import { objectBBox } from '../../model/objectGeometry.ts';
import type { Plan } from '../../model/types.ts';
import { objectById, select } from '../store/actions.ts';
import { usePlanner } from '../store/store.ts';
import { revealBox } from '../store/view.ts';
import { Icon } from '../ui/Icon.tsx';

const t = en.planner.checks;

function message(c: PlanCheck, plan: Plan): string {
  const name = (i: number) => objectById(plan, c.objectIds[i] as string)?.name ?? '';
  const units = plan.settings.units;
  switch (c.kind) {
    case 'overlap':
      return t.overlap(name(0), name(1), formatArea(Number(c.data.m2), units));
    case 'short':
      return t.short(name(0), formatArea(Number(c.data.m2), units));
    case 'noAnimals':
      return t.noAnimals(name(0));
    case 'wrongEnclosure':
      return t.wrongEnclosure(name(0), String(c.data.species), String(c.data.needs));
    case 'outsideMap':
      return t.outsideMap(name(0));
    case 'lowBarrier':
      return t.lowBarrier(
        name(0),
        String(c.data.species),
        Number(c.data.have),
        Number(c.data.need),
      );
  }
}

/** Checks (docs/03 §4.7). Recomputed when the plan settles, not on every drag step. */
export function ChecksPanel() {
  const plan = usePlanner((s) => s.plan);
  const txn = usePlanner((s) => s.txn);
  const [checks, setChecks] = useState<PlanCheck[]>([]);
  useEffect(() => {
    if (!plan || txn) return undefined;
    const timer = setTimeout(() => setChecks(runChecks(plan)), 200);
    return () => clearTimeout(timer);
  }, [plan, txn]);
  if (!plan) return null;
  return (
    <>
      <h2>{t.heading}</h2>
      <p className="field-help">{t.intro}</p>
      <p>
        <strong>{checks.length === 0 ? t.none : t.count(checks.length)}</strong>
      </p>
      <ul className="checks-list" role="list">
        {checks.map((c, i) => (
          <li key={`${c.kind}-${c.objectIds.join('-')}-${i}`} className="check-item">
            <Icon id="warning" size={18} />
            <span>{message(c, plan)}</span>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                select(c.objectIds);
                const o = objectById(plan, c.objectIds[0] as string);
                if (o) revealBox(objectBBox(o));
              }}
            >
              {t.goTo}
              <span className="visually-hidden">
                : {objectById(plan, c.objectIds[0] as string)?.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
