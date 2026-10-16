import { loadPlan as loadStoredPlan } from './db.ts';
import { loadPlan } from '../store/history.ts';
import { getState, setState } from '../store/store.ts';
import { fitMap } from '../store/view.ts';

/** Opens a plan saved in this browser and makes it the current one. */
export async function openStoredPlan(id: string): Promise<boolean> {
  const plan = await loadStoredPlan(id);
  if (!plan) return false;
  loadPlan(plan);
  setState({ prefs: { ...getState().prefs, lastPlanId: plan.id }, saveStatus: 'saved' });
  requestAnimationFrame(fitMap);
  return true;
}
