import { useId, useState } from 'react';
import { en } from '../../i18n/en.ts';
import { updatePlanDetails } from '../store/actions.ts';
import { getState, setState } from '../store/store.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { Icon } from '../ui/Icon.tsx';

const t = en.planner.rename;

export function RenameDialog() {
  const plan = getState().plan;
  const [name, setName] = useState(plan?.name ?? '');
  const [subtitle, setSubtitle] = useState(plan?.subtitle ?? '');
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const subId = useId();
  const submit = () => {
    if (!name.trim()) {
      setError(en.planner.dialogs.required(t.name));
      return;
    }
    updatePlanDetails((d) => {
      d.name = name.trim();
      if (subtitle.trim()) d.subtitle = subtitle.trim();
      else delete d.subtitle;
    });
    setState({ dialog: null });
  };
  return (
    <Dialog
      title={t.title}
      onClose={() => setState({ dialog: null })}
      onSubmit={submit}
      actions={
        <button type="submit" className="btn btn-primary">
          {t.save}
        </button>
      }
    >
      <div className="field">
        <label htmlFor={nameId}>{t.name}</label>
        <input
          id={nameId}
          type="text"
          value={name}
          maxLength={60}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${nameId}-err` : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {error && (
          <span id={`${nameId}-err`} className="field-error">
            <Icon id="error" size={16} />
            {error}
          </span>
        )}
      </div>
      <div className="field">
        <label htmlFor={subId}>{t.subtitle}</label>
        <input
          id={subId}
          type="text"
          value={subtitle}
          maxLength={120}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </div>
    </Dialog>
  );
}
