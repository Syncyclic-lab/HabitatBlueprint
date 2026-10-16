/**
 * Autosave (docs/03 §2.5): writes the plan to IndexedDB 1 s after the last change, outside drag
 * transactions. The status shows "Saving…" then "Saved"; failures are announced assertively.
 */
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import type { Plan } from '../../model/types.ts';
import { getState, plannerStore, setState } from '../store/store.ts';
import { savePlan } from './db.ts';
import { savePrefs } from './prefs.ts';

const DEBOUNCE_MS = 1000;

export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSaved: Plan | null = getState().plan;
  let failed = false;

  const flush = async () => {
    timer = null;
    const { plan, txn, saveStatus } = getState();
    if (!plan || txn || plan === lastSaved || saveStatus === 'unavailable') return;
    setState({ saveStatus: 'saving' });
    try {
      const ok = await savePlan(plan);
      if (!ok) {
        setState({ saveStatus: 'unavailable' });
        return;
      }
      lastSaved = plan;
      failed = false;
      setState({ saveStatus: 'saved' });
    } catch {
      setState({ saveStatus: 'error' });
      if (!failed) announce(en.planner.top.saveError, { assertive: true });
      failed = true;
    }
  };

  const unsubPlan = plannerStore.subscribe((s, prev) => {
    if (s.plan !== prev.plan || s.txn !== prev.txn) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), DEBOUNCE_MS);
    }
    if (s.prefs !== prev.prefs) savePrefs(s.prefs);
  });

  // Save straight away if the page is being hidden or closed.
  const onHide = () => {
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      void flush();
    }
  };
  document.addEventListener('visibilitychange', onHide);

  return () => {
    unsubPlan();
    document.removeEventListener('visibilitychange', onHide);
    if (timer) clearTimeout(timer);
  };
}

/** Marks the current plan as already saved (after opening it), so autosave doesn't rewrite it. */
export function markSaved(): void {
  setState({ saveStatus: 'saved' });
}
