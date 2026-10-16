/**
 * Plan totals (union of every ground-covering shape) are the most expensive numbers in the
 * planner. This hook recomputes them once edits settle (150 ms after the last change, and never
 * mid-drag) instead of on every pointer move.
 */
import { useEffect, useState } from 'react';
import { planTotals, type PlanTotals } from '../../model/totals.ts';
import { getState, plannerStore } from '../store/store.ts';

const SETTLE_MS = 150;

let cached: { objects: unknown; totals: PlanTotals } | null = null;

function compute(): PlanTotals | null {
  const plan = getState().plan;
  if (!plan) return null;
  if (
    cached?.objects === plan.objects &&
    cached.totals.mapM2 === plan.settings.mapWidthM * plan.settings.mapHeightM
  ) {
    return cached.totals;
  }
  const totals = planTotals(plan);
  cached = { objects: plan.objects, totals };
  return totals;
}

export function usePlanTotals(): PlanTotals | null {
  const [totals, setTotals] = useState<PlanTotals | null>(() => compute());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (getState().txn) {
          schedule();
          return;
        }
        setTotals(compute());
      }, SETTLE_MS);
    };
    const unsub = plannerStore.subscribe((s, prev) => {
      if (s.plan?.objects !== prev.plan?.objects || s.plan?.settings !== prev.plan?.settings)
        schedule();
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return totals;
}
