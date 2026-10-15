/**
 * Zod, configured for a strict Content Security Policy.
 * Zod's JIT probes `new Function()`, which a CSP without 'unsafe-eval' reports as a violation.
 * Import `z` from this module, never from 'zod' directly.
 */
import { z } from 'zod';

z.config({ jitless: true });

export { z };
