/**
 * The planner's loading screen lives in the page's static HTML (#boot-screen), outside React, so
 * it shows instantly and both the download step (client directive) and React's startup steps
 * can update it. Labels come from data attributes rendered from en.ts, so this module stays
 * tiny and has no strings of its own.
 */
export type BootStage = 'download' | 'start' | 'storage' | 'open' | 'draw' | 'ready' | 'error';

const root = (): HTMLElement | null => document.getElementById('boot-screen');

let lastPct = 0;
let lastStage: BootStage | null = null;

/** Updates the progress bar (never backwards) and, when the stage changes, the status text. */
export function setBoot(pct: number, stage: BootStage, detail?: string): void {
  const el = root();
  if (!el) return;
  lastPct = Math.max(lastPct, Math.min(100, pct));
  const bar = el.querySelector('progress');
  if (bar) {
    bar.value = lastPct;
    bar.setAttribute('aria-valuetext', `${Math.round(lastPct)}%`);
  }
  const pctEl = el.querySelector('[data-boot-pct]');
  if (pctEl) pctEl.textContent = `${Math.round(lastPct)}%`;
  const detailEl = el.querySelector('[data-boot-detail]');
  if (detailEl) detailEl.textContent = detail ?? '';
  if (stage !== lastStage) {
    lastStage = stage;
    const label = el.dataset[`label${stage[0]?.toUpperCase()}${stage.slice(1)}`];
    const labelEl = el.querySelector('[data-boot-label]');
    if (label && labelEl) labelEl.textContent = label;
    el.dataset.stage = stage;
  }
}

/** Fades the loading screen out and removes it. */
export function finishBoot(): void {
  const el = root();
  if (!el) return;
  setBoot(100, 'ready');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.classList.add('is-done');
  el.setAttribute('aria-hidden', 'true');
  window.setTimeout(() => el.remove(), reduce ? 0 : 450);
}

/** Shows the error state with a reload link (rendered in the static HTML). */
export function failBoot(): void {
  setBoot(lastPct, 'error');
  root()?.classList.add('is-error');
}
