import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  announce,
  createThrottle,
  onAnnounce,
  POLITE_THROTTLE_MS,
} from '../../../src/planner/a11y/announcer.ts';

describe('announce', () => {
  it('sends polite messages by default and assertive ones on request', () => {
    const heard: unknown[] = [];
    const stop = onAnnounce((a) => heard.push(a));
    announce('Saved');
    announce('Couldn’t save', { assertive: true });
    stop();
    announce('not heard');
    expect(heard).toEqual([
      { text: 'Saved', assertive: false },
      { text: 'Couldn’t save', assertive: true },
    ]);
  });
});

describe('createThrottle', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends the first message at once, then at most one per interval, latest wins', () => {
    vi.useFakeTimers();
    const out: string[] = [];
    const t = createThrottle((s) => out.push(s));
    t.push('one');
    t.push('two');
    t.push('three');
    expect(out).toEqual(['one']);
    vi.advanceTimersByTime(POLITE_THROTTLE_MS);
    expect(out).toEqual(['one', 'three']);
    vi.advanceTimersByTime(POLITE_THROTTLE_MS);
    t.push('four');
    expect(out).toEqual(['one', 'three', 'four']);
  });

  it('drops queued messages when cancelled', () => {
    vi.useFakeTimers();
    const out: string[] = [];
    const t = createThrottle((s) => out.push(s), 100);
    t.push('a');
    t.push('b');
    t.cancel();
    vi.advanceTimersByTime(500);
    expect(out).toEqual(['a']);
    t.cancel(); // safe to call twice
  });

  it('calls setTimeout as a plain function (browsers reject it as another object’s method)', () => {
    const realSet = globalThis.setTimeout;
    // Mimic the browser: throw "Illegal invocation" unless called with no other `this`.
    function strictSetTimeout(this: unknown, fn: () => void, ms?: number) {
      if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
      return realSet(fn, ms);
    }
    vi.stubGlobal('setTimeout', strictSetTimeout);
    const out: string[] = [];
    const t = createThrottle((s) => out.push(s), 10);
    expect(() => {
      t.push('a');
      t.push('b');
    }).not.toThrow();
    t.cancel();
    expect(out).toEqual(['a']);
  });
});
