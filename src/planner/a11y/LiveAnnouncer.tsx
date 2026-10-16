import { useEffect, useState } from 'react';
import { createThrottle, onAnnounce } from './announcer.ts';

const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/**
 * The planner's two live regions (docs/03 §2.8). Polite messages are throttled to one per
 * 750 ms, latest wins; assertive ones (save errors) go out at once. A zero-width toggle makes
 * screen readers repeat a message that's identical to the previous one.
 */
export function LiveAnnouncer() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');

  useEffect(() => {
    let flip = false;
    const throttle = createThrottle((text) => {
      flip = !flip;
      setPolite(flip ? text : `${text}${ZERO_WIDTH_SPACE}`);
    });
    const off = onAnnounce((a) => {
      if (a.assertive) setAssertive(a.text);
      else throttle.push(a.text);
    });
    return () => {
      off();
      throttle.cancel();
    };
  }, []);

  return (
    <>
      <div
        className="visually-hidden"
        aria-live="polite"
        aria-atomic="true"
        data-testid="announcer-polite"
      >
        {polite}
      </div>
      <div
        className="visually-hidden"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="announcer-assertive"
      >
        {assertive}
      </div>
    </>
  );
}
