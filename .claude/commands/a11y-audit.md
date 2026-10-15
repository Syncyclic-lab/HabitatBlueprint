---
description: Audit a page, component or planner flow against WCAG 2.2 AA and this project's extra rules.
---

Target: $ARGUMENTS (a route, component path or flow name; if empty, audit everything changed since the last commit on main).

1. Read `docs/08-accessibility.md` and the design tokens in `docs/07-design-system.md`.
2. Run the automated pass: `npm run test:a11y`. Add axe scans for any state of the target that isn't covered yet.
3. Do the manual pass in code and in the running app, and report each item as Pass / Fail / N/A with evidence:
   - Keyboard: reachable, operable, logical order, no traps, Esc exits, shortcuts only with map focus (2.1.1, 2.1.2, 2.1.4, 2.4.3)
   - Focus visible and never hidden by panels (2.4.7, 2.4.11)
   - No drag-only actions and no gesture-only actions (2.5.1, 2.5.7). Targets ≥ 24 px (2.5.8)
   - Names, roles and states, with visible label contained in the name (4.1.2, 2.5.3)
   - Contrast of text, UI and map edges against the tokens (1.4.3, 1.4.11). Colour never the only cue (1.4.1)
   - Status messages through the live region, throttled (4.1.3)
   - Reflow at 320 px, 200% text, text spacing (1.4.4, 1.4.10, 1.4.12)
   - Reduced motion, forced colours, dark mode
   - Errors identified and described, with suggestions (3.3.1, 3.3.3)
4. Fix every Fail you can. List anything you couldn't fix with the reason, and add it to the roadmap Log.
5. Output a short table: criterion · result · evidence/fix.
