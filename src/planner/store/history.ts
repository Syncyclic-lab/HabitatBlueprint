/**
 * Every change to the plan is a labelled command. commit() applies an immer recipe and records
 * one undo step. Drags use a transaction: begin(), any number of update()s, then end() records
 * a single step (docs/06 "Commands and history").
 */
import { produce, type Draft } from 'immer';
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import { nowIso } from '../../model/factory.ts';
import type { Id, Plan } from '../../model/types.ts';
import { getState, MAX_HISTORY, setState, type HistoryEntry } from './store.ts';

const t = en.planner.history;

type Recipe = (draft: Draft<Plan>) => void;

function apply(plan: Plan, recipe: Recipe): Plan {
  return produce(plan, (d) => {
    recipe(d);
    d.updatedAt = nowIso();
  });
}

/** Keeps only ids that still exist in the plan. */
const liveSelection = (plan: Plan, ids: readonly Id[]): Id[] =>
  ids.filter((id) => plan.objects.some((o) => o.id === id));

function push(entry: HistoryEntry): void {
  const { past } = getState();
  setState({ past: [...past, entry].slice(-MAX_HISTORY), future: [] });
}

/**
 * Applies a change as one undo step. `select` sets the selection afterwards (e.g. the new
 * object). Returns false if there is no plan or the change made no difference.
 */
export function commit(label: string, recipe: Recipe, options: { select?: Id[] } = {}): boolean {
  const s = getState();
  if (!s.plan) return false;
  if (s.txn) {
    // Inside a transaction: fold into it; the transaction records the step.
    setState({ plan: apply(s.plan, recipe), ...(options.select ? { selection: options.select } : {}) });
    return true;
  }
  const before = s.plan;
  const after = apply(before, recipe);
  if (after.objects === before.objects && after.settings === before.settings && sameMeta(before, after)) {
    return false;
  }
  const selectionAfter = options.select ?? liveSelection(after, s.selection);
  setState({ plan: after, selection: selectionAfter });
  push({ label, before, after, selectionBefore: s.selection, selectionAfter });
  return true;
}

/** True if nothing but updatedAt changed outside objects and settings. */
function sameMeta(a: Plan, b: Plan): boolean {
  return (
    a.name === b.name &&
    a.subtitle === b.subtitle &&
    a.areas === b.areas &&
    a.speciesLibrary === b.speciesLibrary &&
    a.titleBlock === b.titleBlock &&
    a.tracing === b.tracing &&
    a.snapshots === b.snapshots
  );
}

export function beginTransaction(label: string): void {
  const s = getState();
  if (!s.plan || s.txn) return;
  setState({ txn: { label, base: s.plan } });
}

/** Updates the plan during a transaction (or commits immediately if none is open). */
export function updateTransaction(recipe: Recipe): void {
  const s = getState();
  if (!s.plan) return;
  if (!s.txn) {
    commit(t.plan, recipe);
    return;
  }
  setState({ plan: apply(s.txn.base, recipe) });
}

/** Ends a transaction, recording one undo step if anything changed. */
export function endTransaction(label?: string): void {
  const s = getState();
  if (!s.txn || !s.plan) return;
  const { base } = s.txn;
  setState({ txn: null });
  if (s.plan.objects === base.objects && s.plan.settings === base.settings && sameMeta(base, s.plan)) {
    setState({ plan: base });
    return;
  }
  push({
    label: label ?? s.txn.label,
    before: base,
    after: s.plan,
    selectionBefore: s.selection,
    selectionAfter: s.selection,
  });
}

export function cancelTransaction(): void {
  const s = getState();
  if (!s.txn) return;
  setState({ plan: s.txn.base, txn: null });
}

export function undo(): void {
  const s = getState();
  if (s.txn) cancelTransaction();
  const entry = getState().past.at(-1);
  if (!entry) {
    announce(t.nothingToUndo);
    return;
  }
  setState({
    plan: entry.before,
    past: getState().past.slice(0, -1),
    future: [entry, ...getState().future],
    selection: liveSelection(entry.before, entry.selectionBefore),
    vertexEdit: null,
    draft: null,
  });
  announce(t.undid(entry.label));
}

export function redo(): void {
  const entry = getState().future[0];
  if (!entry) {
    announce(t.nothingToRedo);
    return;
  }
  setState({
    plan: entry.after,
    past: [...getState().past, entry].slice(-MAX_HISTORY),
    future: getState().future.slice(1),
    selection: liveSelection(entry.after, entry.selectionAfter),
    vertexEdit: null,
    draft: null,
  });
  announce(t.redid(entry.label));
}

/** Replaces the whole plan without an undo step (opening a plan). Clears history. */
export function loadPlan(plan: Plan | null): void {
  setState({
    plan,
    past: [],
    future: [],
    txn: null,
    selection: [],
    vertexEdit: null,
    draft: null,
  });
}
