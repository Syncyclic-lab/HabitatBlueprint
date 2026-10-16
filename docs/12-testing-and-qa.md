# 12 · Testing and QA

## Layers
| Layer | Tool | What it proves | Gate |
|---|---|---|---|
| Unit | Vitest (+ fast-check property tests) | Geometry, measurements, requirement maths, migrations, Zod schemas, formatters | `src/geometry` 100% branches; overall ≥ 85% lines |
| Component | Vitest + Testing Library | Inspector fields, dialogs, panels: names, roles, keyboard behaviour | Every interactive component has at least one keyboard test |
| E2E | Playwright (Chromium, Firefox, WebKit) | Real user flows, keyboard-only scripts, export output, persistence | All green on 3 engines |
| Automated a11y | @axe-core/playwright (WCAG 2.0/2.1/2.2 A+AA tags) | Catches about a third of issues | **0 violations** |
| Performance | Lighthouse CI + a Playwright FPS probe | Landing CWV, planner pan/zoom fps | Budgets below |
| Security/privacy | Playwright listeners | No CSP violations, no third-party requests, no cookies | Zero tolerance |
| Manual a11y | Trusted Tester-style checklist + AT matrix | The two-thirds that automation misses | Before each milestone sign-off (light) and at M8 (full) |

## Golden geometry cases (must exist as unit tests)
| Case | Expected |
|---|---|
| Rectangle 50 × 40 m | 2,000 m², perimeter 180 m, 0.20% of a 1,000,000 m² map |
| Circle r = 10 m (flattened) | 314.16 m² ± 0.1% |
| L-shape (0,0)(30,0)(30,10)(10,10)(10,30)(0,30) | 500 m², perimeter 120 m |
| Square 20 × 20 with a 5 × 5 hole | 375 m² |
| Two 10 × 10 squares overlapping by 5 × 10 | union 150 m² (not 200) |
| Habitat 40 × 40, water 10 × 10, deep water 5 × 5 inside the water | total 1,600; water 100; deep 25; land 1,500 |
| Water zone half outside its habitat | clipped: only the inside half counts |
| Guest path 100 m × 4 m, round caps | ≈ 412.57 m²; flat caps exactly 400 m² |
| Resize-to-area on any polygon to 1,234 m² | within 0.01 m² |
| Map preset changed to 1000 × 990 | every "% of map" recomputes correctly |
| Self-intersecting bow-tie polygon | rejected with an error code |
| Requirement fixtures | match `data/species-requirements.example.json` → `testExpectations` |

## Planner states scanned by axe (`@a11y`)
1. Empty planner, new-plan dialog open
2. Empty map after creation (with the inline prompt)
3. Habitat tool mid-drawing (3 points placed)
4. Habitat selected, Inspector open
5. Vertex edit mode
6. Objects panel expanded with 20 objects
7. Context menu open
8. Shortcuts dialog
9. Map settings dialog with a validation error showing
10. Stats panel (tables)
11. Legend and title block preview
12. Export dialog
Plus every content page, in light, dark and forced-colors emulation.

## Keyboard-only E2E scripts (no `page.mouse` allowed in these files)
- **K1 Create and measure:** new plan → choose Desert biome → H → place a 50 × 40 m rectangle with the arrow-key crosshair → Enter → assert the live region text and Inspector area "2,000 m²".
- **K2 Add by size:** "Add habitat by size…" → 1,500 m² circle → assert the area within rounding → Resize to area 2,000.
- **K3 Water zone:** select habitat → Add zone → Water → draw 10 × 10 → assert land = total − 100.
- **K4 Edit numerically:** vertex table → change a vertex x → assert the area updates.
- **K5 Path:** P → draw 3 points → Enter → set width 6 → assert length and area.
- **K6 Organise:** create an area "African grasslands" → assign 2 habitats → check the legend preview text.
- **K7 Undo flow:** 5 actions → undo ×5 → redo ×2 → assert state and announcements.
- **K8 Save/open:** save to file → delete all data → open the file → objects restored.
- **K9 Region cycling:** F6 through all regions, and focus is never lost or hidden (2.4.11).

## Assistive technology matrix (manual, M3 smoke, M8 full)
| AT | Browser | OS |
|---|---|---|
| NVDA (latest) | Firefox, Chrome | Windows 11 |
| JAWS (latest) | Chrome | Windows 11 |
| Narrator | Edge | Windows 11 |
| VoiceOver | Safari | macOS |
| VoiceOver | Safari | iOS (iPad + iPhone) |
| TalkBack | Chrome | Android |
| Voice Control / Dragon | Safari / Chrome | macOS / Windows (label-in-name, clickable targets) |
| Windows High Contrast (forced colours) | Edge | Windows 11 |
| Browser zoom 200% and 400%, text spacing bookmarklet | All | — |
| Switch access / keyboard only | Chrome | any |

**Screen-reader task scripts** (pass = completed unaided, in reasonable time, using the documented method):
1. Create a plan called "Test Zoo" on the Tundra biome.
2. Add a 900 m² habitat named "Wolves" by size, and add a 60 m² water zone.
3. Find the land area of "Wolves".
4. Add 2 males and 4 females of a species, then find out whether the habitat is big enough.
5. Export a text summary and confirm it lists Wolves with correct areas.

## Budgets
- Landing: LCP < 2.5 s, INP < 200 ms, CLS < 0.1 (Lighthouse mobile simulation). JS ≤ 30 kB gz. Fonts ≤ 2 files preloaded.
- Planner: initial JS ≤ 250 kB gz. Time to interactive < 3 s on mid-tier laptop. Pan/zoom ≥ 55 fps with the 500-object fixture. Edit → readout update < 100 ms.

Measure with `node scripts/perf-probe.mjs [fixture] [cpuSlowdown]` against the built site (`npm run preview`); `tests/unit/model/totals-perf.test.ts` checks the 150-object totals budget locally (skipped in CI).

## Fixtures (`tests/fixtures/`)
Generated by `node scripts/make-fixtures.mjs` (seeded, so re-running only changes them when the script changes). `tests/unit/model/plan-files.test.ts` checks the good ones import and every hostile one is rejected.
- `empty.zooplan.json`
- `crystal-ridge-like.zooplan.json`: about 150 objects arranged like the reference poster (our own drawing, no game data beyond names)
- `stress-500.zooplan.json`
- `hostile/*.json`: oversized, deeply nested, prototype-pollution keys, script-injection names, NaN/Infinity coordinates, 10,000-point polygon
