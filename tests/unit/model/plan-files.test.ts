import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePlanText } from '../../../src/planner/persistence/file.ts';

const dir = join(import.meta.dirname, '..', '..', 'fixtures');
const read = (...parts: string[]) => readFileSync(join(dir, ...parts), 'utf8');

describe('plan file fixtures', () => {
  it.each([
    ['empty.zooplan.json', 0],
    ['crystal-ridge-like.zooplan.json', 150],
    ['stress-500.zooplan.json', 500],
  ])('%s imports with %i objects', (name, count) => {
    const result = parsePlanText(read(name));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.plan.objects.length).toBeGreaterThanOrEqual(count);
  });

  const hostile = readdirSync(join(dir, 'hostile'));

  it('has hostile samples', () => {
    expect(hostile.length).toBeGreaterThanOrEqual(8);
  });

  it.each(hostile)('rejects hostile/%s', (name) => {
    const result = parsePlanText(read('hostile', name));
    expect(result.ok).toBe(false);
    // Parsing never pollutes Object.prototype.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects text over the size limit before parsing it', () => {
    expect(parsePlanText(' '.repeat(10 * 1024 * 1024 + 1))).toEqual({
      ok: false,
      reason: 'tooBig',
    });
  });
});
