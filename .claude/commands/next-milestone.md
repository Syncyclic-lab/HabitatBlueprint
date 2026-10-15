---
description: Pick up the next unfinished roadmap milestone, plan it, build it, verify it, and update the roadmap.
---

1. Read `CLAUDE.md`, then `docs/11-roadmap.md`. Find the **current milestone** (the first one with unticked boxes).
2. Read every doc that milestone touches (use the table at the top of `CLAUDE.md`). Check `docs/13-open-questions.md` for anything that blocks it. If something does, ask Kyle before starting.
3. Write a short plan (5–12 steps) in plain language and show it to Kyle before writing code.
4. Build in small commits (Conventional Commits). After each step, run `npm run check` and the relevant tests.
5. Before calling the milestone done, run the full Definition of Done from `CLAUDE.md`: check, test, test:e2e (incl. @a11y), licenses, build. Then manually tab through every new UI element and confirm the focus indicator, accessible name and that Esc exits.
6. Tick the boxes in `docs/11-roadmap.md`, add a dated Log line for anything deferred, and move "Current milestone" forward.
7. Summarise for Kyle in five lines or fewer: what works now, how to try it (`npm run dev` → URL), and anything he needs to decide.

$ARGUMENTS
