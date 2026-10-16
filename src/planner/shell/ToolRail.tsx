import { useRef, type KeyboardEvent } from 'react';
import { en } from '../../i18n/en.ts';
import { formatKey, SHORTCUTS } from '../a11y/shortcuts.ts';
import { useMediaQuery } from '../hooks/useMediaQuery.ts';
import { usePlanner } from '../store/store.ts';
import { setTool } from '../tools/drawing.ts';
import { TOOLS } from '../tools/tools.ts';
import { Icon } from '../ui/Icon.tsx';

/**
 * The tool rail: a toolbar of toggle buttons with visible text labels (docs/07), roving
 * tabindex and arrow-key navigation (one Tab stop for the whole rail).
 */
export function ToolRail() {
  const tool = usePlanner((s) => s.tool);
  const prefs = usePlanner((s) => s.prefs);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // A column beside the map on wider screens, a scrolling row above it on phones (planner.css).
  const vertical = useMediaQuery('(min-width: 640px)');

  const keyFor = (shortcutId: string): string | null => {
    if (!prefs.singleKeyShortcuts) return null;
    const override = prefs.shortcutOverrides[shortcutId as keyof typeof prefs.shortcutOverrides];
    const def = SHORTCUTS.find((s) => s.id === shortcutId);
    const key = override ?? def?.keys[0];
    return key ? formatKey(key) : null;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = refs.current.findIndex((r) => r === document.activeElement);
    if (index === -1) return;
    let target = -1;
    // Both arrow pairs work either way round, so nobody has to guess the orientation.
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') target = (index + 1) % TOOLS.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')
      target = (index - 1 + TOOLS.length) % TOOLS.length;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = TOOLS.length - 1;
    if (target >= 0) {
      e.preventDefault();
      refs.current[target]?.focus();
    }
  };

  return (
    <nav className="pl-rail" data-region="tools" aria-label={en.planner.regions.tools}>
      <div
        role="toolbar"
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
        aria-label={en.planner.regions.tools}
        onKeyDown={onKeyDown}
        className="rail-toolbar"
      >
        {TOOLS.map((def, i) => {
          const active = def.id === tool;
          const key = keyFor(def.shortcut);
          return (
            <button
              key={def.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className="tool-btn"
              aria-pressed={active}
              tabIndex={active ? 0 : -1}
              aria-keyshortcuts={key ?? undefined}
              onClick={() => setTool(def.id)}
            >
              <Icon id={def.icon} size={22} />
              <span>{def.label}</span>
              {key && (
                <span className="tool-key" aria-hidden="true">
                  {key}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
