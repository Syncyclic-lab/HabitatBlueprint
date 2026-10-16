/**
 * The planner's live-region announcer (WCAG 4.1.3). Anything can call announce(); the
 * <LiveAnnouncer> component owns the regions and throttles polite messages to one per 750 ms,
 * latest wins (docs/03 §2.8). Assertive messages (save errors) go out immediately.
 */
export interface Announcement {
  text: string;
  assertive: boolean;
}

type Listener = (a: Announcement) => void;

const listeners = new Set<Listener>();

export function announce(text: string, options: { assertive?: boolean } = {}): void {
  const a = { text, assertive: options.assertive ?? false };
  for (const l of listeners) l(a);
}

export function onAnnounce(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const POLITE_THROTTLE_MS = 750;

type TimerId = ReturnType<typeof setTimeout>;

export interface Timers {
  set: (fn: () => void, ms: number) => TimerId;
  clear: (id: TimerId) => void;
}

// Wrapped rather than stored as `{ set: setTimeout }`: browsers throw "Illegal invocation"
// when setTimeout is called as a method of another object.
const browserTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id),
};

/**
 * Throttles a stream of messages: the first goes out at once, then at most one per `ms`,
 * always the latest. Returns a push function and a cancel function.
 */
export function createThrottle(
  emit: (text: string) => void,
  ms: number = POLITE_THROTTLE_MS,
  timers: Timers = browserTimers,
): { push: (text: string) => void; cancel: () => void } {
  let pending: string | null = null;
  let timer: TimerId | null = null;
  const tick = () => {
    if (pending === null) {
      timer = null;
      return;
    }
    emit(pending);
    pending = null;
    timer = timers.set(tick, ms);
  };
  return {
    push(text) {
      pending = text;
      if (timer === null) tick();
    },
    cancel() {
      if (timer !== null) timers.clear(timer);
      timer = null;
      pending = null;
    },
  };
}
