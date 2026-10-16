/** App preferences in localStorage (UI conveniences only; docs/09). Reads never throw. */
import { z } from '../../lib/zod.ts';
import { SHORTCUTS } from '../a11y/shortcuts.ts';
import { DEFAULT_PREFS, type Prefs } from '../store/store.ts';

const KEY = 'hb:prefs';

const shortcutIds = SHORTCUTS.map((s) => s.id) as [string, ...string[]];

const prefsSchema = z.strictObject({
  singleKeyShortcuts: z.boolean(),
  shortcutOverrides: z.partialRecord(z.enum(shortcutIds), z.string().min(1).max(20)),
  theme: z.enum(['system', 'light', 'dark']),
  showMinimap: z.boolean(),
  lastPlanId: z.string().max(40).nullable(),
});

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = prefsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? ({ ...DEFAULT_PREFS, ...parsed.data } as Prefs) : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked or full: preferences just won't persist.
  }
}

/** Applies the theme preference to <html data-theme> (tokens.css reads it). */
export function applyTheme(theme: Prefs['theme']): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}
