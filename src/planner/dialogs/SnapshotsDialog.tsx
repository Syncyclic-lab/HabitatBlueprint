import { useId, useState } from 'react';
import { en } from '../../i18n/en.ts';
import { newId, nowIso } from '../../model/factory.ts';
import { announce } from '../a11y/announcer.ts';
import { deleteSnapshot, loadSnapshot, saveSnapshot } from '../persistence/db.ts';
import { commit } from '../store/history.ts';
import { getState, setState, usePlanner } from '../store/store.ts';
import { Dialog } from '../ui/Dialog.tsx';

const t = en.planner.snapshots;
const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

/** Named versions of the plan (docs/03 §2.5). Restoring is one undo step. */
export function SnapshotsDialog() {
  const plan = usePlanner((s) => s.plan);
  const [name, setName] = useState('');
  const nameId = useId();
  if (!plan) return null;

  const take = async () => {
    const id = newId();
    const label = (name.trim() || t.defaultName(dateFmt.format(new Date()))).slice(0, 60);
    const current = getState().plan;
    if (!current) return;
    await saveSnapshot(current.id, id, current);
    commit(t.taken(label), (d) => {
      d.snapshots.push({ id, name: label, createdAt: nowIso() });
    });
    setName('');
    announce(t.taken(label));
  };

  const restore = async (id: string, label: string) => {
    const snap = await loadSnapshot(plan.id, id);
    if (!snap) return;
    commit(en.planner.history.restoreSnapshot(label), (d) => {
      d.objects = snap.objects;
      d.areas = snap.areas;
      d.speciesLibrary = snap.speciesLibrary;
      d.settings = snap.settings;
    });
    setState({ dialog: null });
    announce(t.restored(label));
  };

  return (
    <Dialog
      title={t.title}
      onClose={() => setState({ dialog: null })}
      cancelLabel={en.planner.dialogs.close}
    >
      <p>{t.intro}</p>
      <div className="field-row">
        <div className="field">
          <label htmlFor={nameId}>{t.name}</label>
          <input
            id={nameId}
            type="text"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field add-species">
          <button type="button" className="btn" onClick={() => void take()}>
            {t.take}
          </button>
        </div>
      </div>
      {plan.snapshots.length === 0 ? (
        <p>{t.empty}</p>
      ) : (
        <ul className="template-list" role="list">
          {plan.snapshots.map((s) => (
            <li key={s.id} className="template-item">
              <div>
                <strong>{s.name}</strong>
                <p className="field-help">
                  {t.created}: {dateFmt.format(new Date(s.createdAt))}
                </p>
              </div>
              <div className="inline-actions">
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => void restore(s.id, s.name)}
                >
                  {t.restore(s.name)}
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={async () => {
                    await deleteSnapshot(plan.id, s.id);
                    commit(en.planner.history.plan, (d) => {
                      d.snapshots = d.snapshots.filter((x) => x.id !== s.id);
                    });
                  }}
                >
                  {t.delete(s.name)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
