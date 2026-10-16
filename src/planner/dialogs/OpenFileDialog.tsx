import { en } from '../../i18n/en.ts';
import type { PlanFile } from '../../model/schema.ts';
import type { Plan } from '../../model/types.ts';
import { announce } from '../a11y/announcer.ts';
import { savePlan } from '../persistence/db.ts';
import { withFreshIds } from '../persistence/file.ts';
import { loadPlan } from '../store/history.ts';
import { getState, setState } from '../store/store.ts';
import { fitMap } from '../store/view.ts';
import { Dialog } from '../ui/Dialog.tsx';

const t = en.planner.openFile;

/**
 * Confirms before opening a file or share link (docs/03 §5): shows a summary, then saves it as a
 * new plan with fresh ids. Nothing existing is overwritten.
 */
export function OpenFileDialog({ file, source }: { file: PlanFile; source: 'file' | 'link' }) {
  const plan = file.plan as Plan;
  const open = async () => {
    const copy = withFreshIds(plan);
    loadPlan(copy);
    await savePlan(copy);
    setState({
      dialog: null,
      prefs: { ...getState().prefs, lastPlanId: copy.id },
      saveStatus: 'saved',
    });
    if (source === 'link') history.replaceState(null, '', location.pathname + location.search);
    requestAnimationFrame(fitMap);
    announce(en.planner.plans.opened(copy.name));
  };
  return (
    <Dialog
      title={source === 'link' ? t.fromLink : t.title}
      onClose={() => {
        if (source === 'link') history.replaceState(null, '', location.pathname + location.search);
        setState({ dialog: null });
      }}
      onSubmit={() => void open()}
      actions={
        <button type="submit" className="btn btn-primary" data-autofocus>
          {t.open}
        </button>
      }
    >
      <p>{t.summary(plan.name, plan.objects.length)}</p>
      <p>{t.copyNote}</p>
    </Dialog>
  );
}
