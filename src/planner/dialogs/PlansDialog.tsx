import { useEffect, useState } from 'react';
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import {
  deletePlan,
  listPlans,
  loadPlan as loadStoredPlan,
  savePlan,
  type PlanIndexEntry,
} from '../persistence/db.ts';
import { withFreshIds } from '../persistence/file.ts';
import { openStoredPlan } from '../persistence/openStored.ts';
import { getState, setState } from '../store/store.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { ScrollRegion } from '../ui/ScrollRegion.tsx';

const t = en.planner.plans;

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

/** Plans saved in this browser (docs/02: decided at M3 to be a dialog inside /planner). */
export function PlansDialog({ onOpenFile }: { onOpenFile: () => void }) {
  const [plans, setPlans] = useState<PlanIndexEntry[] | null>(null);
  const currentId = getState().plan?.id;
  const refresh = () => void listPlans().then(setPlans);
  useEffect(refresh, []);

  const close = () => setState({ dialog: null });
  return (
    <Dialog title={t.title} onClose={close} cancelLabel={en.planner.dialogs.close} wide>
      <p>{t.intro}</p>
      <div className="inline-actions">
        <button
          type="button"
          className="btn"
          onClick={() => setState({ dialog: { id: 'newPlan' } })}
        >
          {t.newPlan}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            close();
            onOpenFile();
          }}
        >
          {t.import}
        </button>
      </div>
      {plans === null ? null : plans.length === 0 ? (
        <p>{t.empty}</p>
      ) : (
        <ScrollRegion label={t.title}>
          <table className="data-table">
            <caption className="visually-hidden">{t.title}</caption>
            <thead>
              <tr>
                <th scope="col">{t.name}</th>
                <th scope="col">{t.updated}</th>
                <th scope="col" className="num">
                  {t.objects}
                </th>
                <th scope="col">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    {p.name}
                    {p.id === currentId && <span className="field-help"> ({t.current})</span>}
                  </th>
                  <td>{dateFmt.format(new Date(p.updatedAt))}</td>
                  <td className="num">{p.objectCount}</td>
                  <td>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="btn btn-small"
                        disabled={p.id === currentId}
                        aria-label={t.open(p.name)}
                        onClick={async () => {
                          if (await openStoredPlan(p.id)) {
                            close();
                            announce(t.opened(p.name));
                          }
                        }}
                      >
                        {t.openButton}
                      </button>
                      <button
                        type="button"
                        className="btn btn-small"
                        aria-label={t.duplicate(p.name)}
                        onClick={async () => {
                          const plan = await loadStoredPlan(p.id);
                          if (!plan) return;
                          await savePlan(
                            withFreshIds(plan, `${plan.name}${t.copySuffix}`.slice(0, 60)),
                          );
                          refresh();
                        }}
                      >
                        {en.planner.actions.duplicate}
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        disabled={p.id === currentId}
                        aria-label={t.delete(p.name)}
                        onClick={async () => {
                          if (!window.confirm(t.confirmDelete(p.name))) return;
                          await deletePlan(p.id);
                          announce(t.deleted(p.name));
                          refresh();
                        }}
                      >
                        {en.planner.actions.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}
    </Dialog>
  );
}
