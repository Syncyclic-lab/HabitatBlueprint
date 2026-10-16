import { useId, useState } from 'react';
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import { createPlan } from '../../model/factory.ts';
import { deleteAllData } from '../persistence/db.ts';
import { loadPlan } from '../store/history.ts';
import { DEFAULT_PREFS, setState } from '../store/store.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { Icon } from '../ui/Icon.tsx';

const t = en.planner.deleteAll;

/** Delete all my data (docs/09): clears IndexedDB and our localStorage after confirmation. */
export function DeleteAllDialog() {
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const submit = async () => {
    if (word.trim() !== t.confirmWord) {
      setError(t.mismatch);
      return;
    }
    await deleteAllData();
    loadPlan(createPlan({ name: en.planner.newPlan.defaultName, mode: 'sandbox' }));
    setState({
      dialog: { id: 'newPlan', firstRun: true },
      prefs: { ...DEFAULT_PREFS },
      saveStatus: 'idle',
    });
    announce(t.done);
  };
  return (
    <Dialog
      title={t.title}
      onClose={() => setState({ dialog: null })}
      onSubmit={() => void submit()}
      actions={
        <button type="submit" className="btn btn-danger">
          {t.delete}
        </button>
      }
    >
      <p>{t.body}</p>
      <div className="field">
        <label htmlFor={id}>{t.confirmLabel}</label>
        <input
          id={id}
          type="text"
          value={word}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => setWord(e.target.value)}
        />
        {error && (
          <span id={`${id}-err`} className="field-error">
            <Icon id="error" size={16} />
            {error}
          </span>
        )}
      </div>
    </Dialog>
  );
}
