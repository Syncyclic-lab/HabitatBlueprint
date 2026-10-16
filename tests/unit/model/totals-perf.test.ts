import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { planTotals } from '../../../src/model/totals.ts';
import type { MapObject, Plan } from '../../../src/model/types.ts';

const fixture = (name: string): Plan =>
  JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'fixtures', name), 'utf8'))
    .plan as Plan;

/** Median time of `run` over `n` tries, in ms. */
function median(n: number, run: () => void): number {
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    run();
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(n / 2)] as number;
}

/** The plan after nudging one habitat 1 m east (a new object, as an edit would make). */
function nudged(plan: Plan, step: number): Plan {
  const i = plan.objects.findIndex((o) => o.type === 'habitat');
  const o = plan.objects[i] as Extract<MapObject, { type: 'habitat' }>;
  const shape = o.shape.kind === 'rect' ? { ...o.shape, x: o.shape.x + step * 0.01 } : o.shape;
  const objects = [...plan.objects];
  objects[i] = { ...o, shape };
  return { ...plan, objects };
}

// Timing budgets only mean something on a developer machine; CI runners vary too much.
describe.skipIf(Boolean(process.env.CI))(
  'totals performance (docs/11 M3: < 16 ms for 150 objects)',
  () => {
    it('recomputes the 150-object plan after an edit in under 16 ms', () => {
      const plan = fixture('crystal-ridge-like.zooplan.json');
      expect(plan.objects.length).toBeGreaterThanOrEqual(150);
      planTotals(plan); // first open: every footprint is built once
      let step = 0;
      const ms = median(15, () => planTotals(nudged(plan, ++step)));
      console.log(`planTotals after one edit, 150 objects: ${ms.toFixed(2)} ms`);
      expect(ms).toBeLessThan(16);
    });
  },
);
