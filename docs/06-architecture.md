# 06 · Architecture

## Why this stack
| Decision | Choice | Why | Rejected |
|---|---|---|---|
| Site framework | **Astro 6, static output** | Content pages ship as plain HTML with no JS, which is fast and robust and simplifies accessibility. Astro 6 has a stable **CSP API** (hashes for its own scripts/styles), so we can run a strict CSP without `unsafe-inline`. React islands fit the planner. | Next.js (server features we don't need), plain Vite SPA (landing page would need JS) |
| Planner UI | **React 19 + TypeScript strict** | Largest ecosystem for accessible primitives and testing, and well understood by Claude Code. | Svelte/Vue: fine, but fewer accessibility-tested component patterns to copy |
| Map rendering | **SVG** | Objects are real DOM nodes, so they can carry names, focus and ARIA. Crisp at any zoom, and SVG export is nearly free. A plan of ~150–500 objects is well within SVG's comfort zone. | Canvas/Konva/Pixi: fast, but invisible to assistive technology, so we'd have to build a parallel DOM anyway |
| State | **Zustand** + immer + **zundo** history | Small, simple, works outside React (geometry tests, workers). | Redux (boilerplate), XState (overkill for this) |
| Geometry | Own `src/geometry/` + **polygon-clipping** (MIT) | Area and perimeter are ~50 lines we must own and test exhaustively. Booleans (union/intersection/difference) are hard to get right, so use a proven library. | Turf (geodesic, wrong for a flat meter grid), JSTS (large) |
| Validation | **Zod** | One schema for TS types, import validation and data-file validation. | |
| Storage | **idb** (IndexedDB wrapper) | Async, large capacity, stores Blobs for tracing images. | localStorage (5 MB, sync, strings only) |
| Compression | **lz-string** | Share links. | |
| Fonts | **@fontsource/atkinson-hyperlegible-next** and **-mono** (OFL-1.1) | Self-hosted, so no third-party request (GDPR) and CSP stays `font-src 'self'`. | Google Fonts CDN |
| Accessible primitives | Native HTML first (`<dialog>`, `<details>`, `<button>`, `<input type=number>`). For menus, tabs and tree grids use **React Aria** (Adobe, Apache-2.0) hooks | React Aria is the most thoroughly AT-tested hook library. | Radix (good, but less thorough on tree grid/grid) |
| Tests | Vitest · Playwright · @axe-core/playwright · Lighthouse CI | See `12-testing-and-qa.md`. | |
| Hosting | **Cloudflare Pages** (static) | Free tier, global CDN, `_headers` file for CSP/HSTS, custom domain, automatic HTTPS. | GitHub Pages (can't set response headers, so no real CSP/HSTS) |

> Before scaffolding, look up the current stable versions of each package. Pin them exactly and write them into the table below.

Pinned at M0 (2026-10-15). Versions that moved on from the original plan are noted.

| Package | Pinned version | Licence | Note |
|---|---|---|---|
| astro | 7.4.0 | MIT | Astro 7 is current; its CSP API is unchanged from 6. Dev dependency (build tool) |
| @astrojs/react | 7.1.0 | MIT | Dev dependency |
| react / react-dom | 19.3.1 | MIT | |
| typescript | 6.0.3 | Apache-2.0 | TS 7.0 (native compiler) exists, but typescript-eslint and @astrojs/check only support ≤ 6 |
| zustand / immer | 5.0.15 / 11.1.21 | MIT | zundo dropped: our own labelled history (`src/planner/store/history.ts`) |
| polygon-clipping | 0.15.7 | MIT | |
| zod | 4.6.7 | MIT | Imported via `src/lib/zod.ts` with `jitless: true` for the CSP |
| idb | 8.0.4 | ISC | |
| lz-string | 1.5.0 | MIT | |
| react-aria-components | 1.22.1 | Apache-2.0 | |
| @fontsource/atkinson-hyperlegible-next, -mono | 5.3.0 | OFL-1.1 (font) | |
| nanoid | 6.0.2 | MIT | |
| vitest / @vitest/coverage-v8 | 5.0.5 | MIT | |
| @playwright/test | 1.64.1 | Apache-2.0 | |
| @axe-core/playwright | 4.14.0 | MPL-2.0 | Dev only |
| eslint / typescript-eslint | 10.12.0 / 8.71.2 | MIT | |
| eslint-plugin-jsx-a11y-x | 0.2.0 | MIT | Maintained fork of eslint-plugin-jsx-a11y that supports ESLint 10 |
| eslint-plugin-astro | 3.2.1 | MIT | |
| prettier / prettier-plugin-astro | 3.9.10 / 1.1.1 | MIT | |
| @lhci/cli | 0.15.1 | Apache-2.0 | Run with `npx` (not installed), reports kept on disk |

**Hosting decision (Kyle, 2026-10-15):** GitHub Pages instead of Cloudflare Pages for now. The site is served from `https://syncyclic-lab.github.io/HabitatBlueprint/`, so Astro's `base` is `/HabitatBlueprint` (override with `SITE_BASE` / `SITE_ORIGIN`). See `09-privacy-and-security.md` for what that means for headers.

## Folder structure (target)
```
/
├─ CLAUDE.md, README.md, .nvmrc, .npmrc, .gitignore, .editorconfig
├─ docs/  data/  reference/
├─ public/
│  ├─ _headers                      # security headers (09-privacy-and-security.md)
│  ├─ .well-known/security.txt
│  ├─ favicon.svg, robots.txt
├─ src/
│  ├─ config/site.ts               # SITE_NAME, URLs, contact, version
│  ├─ i18n/en.ts                   # every UI string
│  ├─ styles/
│  │  ├─ tokens.css                # design tokens (07-design-system.md)
│  │  ├─ base.css                  # resets, focus, typography
│  │  └─ print.css                 # poster/print layout
│  ├─ layouts/BaseLayout.astro     # skip link, header, footer + disclaimer
│  ├─ pages/                       # index, planner, help, accessibility, privacy, terms, credits, 404
│  ├─ components/site/             # Astro components for content pages (+ HeroDemo island)
│  ├─ data/                        # Zod schemas + loaders for /data/*.json
│  ├─ model/                       # types.ts, schema.ts, migrations/
│  ├─ geometry/                    # PURE TS: area, perimeter, clip, offset, flatten, snap, hit-test, simplify
│  ├─ planner/
│  │  ├─ App.tsx                   # planner root (island)
│  │  ├─ store/                    # zustand slices: plan, selection, tool, view, history, prefs
│  │  ├─ tools/                    # one module per tool: state machine + pointer + keyboard handlers
│  │  ├─ map/                      # SVG renderer: Viewport, Grid, ObjectLayer, SelectionLayer, Crosshair, Minimap, ScaleBar
│  │  ├─ panels/                   # Inspector, Objects, AreasLegend, Stats, Checks, MapSettings
│  │  ├─ dialogs/                  # NewPlan, AddBySize, ResizeToArea, MoveBy, Shortcuts, Import, Export
│  │  ├─ a11y/                     # LiveAnnouncer, focus management, shortcut registry
│  │  ├─ persistence/              # idb, autosave, file import/export, share link
│  │  └─ export/                   # png, svg, print, text summary
│  └─ assets/icons/                # our SVG icons + manifest.json (source, author, licence per icon)
├─ tests/
│  ├─ unit/                        # vitest (geometry 100% branches)
│  ├─ e2e/                         # playwright, incl. keyboard-only scripts and axe scans (@a11y)
│  └─ fixtures/                    # sample plans
└─ .github/workflows/ci.yml
```

## Planner internals

### Tools are state machines
Each tool exports `{ id, label, shortcut, onPointer(evt), onKey(evt), render(): ReactNode, describe(): string }`. Internal states are explicit (`idle → placing → closing → done/cancelled`). Pointer and keyboard handlers produce the **same commands** (`addPoint`, `finish`, `cancel`), so both paths share one code path and one test suite.

### Commands and history
Every mutation is a named command (`createObject`, `moveObjects`, `editVertex`, …) that goes through the store. History records commands with human-readable labels, which feed undo announcements. A drag gets one `begin/commit` transaction.

### Rendering
- One `<svg>` with `viewBox` driven by the view state (pan/zoom). Map coordinates are meters, and the `viewBox` handles scaling.
- Strokes that should look constant on screen (casing, selection, grid) use `vector-effect="non-scaling-stroke"`.
- Layer order: ground → tracing → grid → planting → water → plazas → paths → habitats (+ zones) → buildings → barriers → icons → labels → measures → selection/handles → crosshair.
- Patterns are `<pattern>` defs in user-space units, scaled so they stay readable at common zooms.
- Hit-testing uses DOM events on shapes, plus a geometry-based fallback for thin paths (stroke hit areas widened to 24 px).
- Performance budget: **pan/zoom at 60 fps with 500 objects** on a mid-range laptop (4-core, integrated GPU). If SVG misses it, profile first. The fix order is memoization → `content-visibility`/culling of off-screen groups → rasterize the static layer to an `<image>` while panning. Moving to canvas is a last resort and needs Kyle's sign-off.

### Geometry module rules
- Pure functions, no globals, no DOM.
- Polygons are normalized to clockwise outer rings and counter-clockwise holes, and duplicate consecutive points are removed.
- Flatten curves with a max chord error of 0.05 m. Rounded corners, ellipses and smoothed paths all go through one `flatten()` function.
- Path surfaces = union of segment quads + round joins/caps (circle polygons, 32 segments), clipped to the map.
- Use a tolerance-aware comparison with ε = 1e-6 m.
- Property-based tests (fast-check) cover: area is translation/rotation invariant, union area ≤ sum of areas, clip result ⊆ input, and resize-to-area hits the target within 0.01 m².

### Persistence
- Autosave writes the whole plan (small, ~100 KB typical) after a 1 s debounce. Use a single IndexedDB transaction per save.
- If IndexedDB is unavailable (some private modes), show a non-modal banner: "This browser isn't saving your plan. Use Save to file." The app keeps working in memory.

### Export
- **SVG:** serialize a clean copy of the map layer (no handles), embed fonts as subsetted WOFF2 *only if* the font licence permits (OFL does), and add `<title>`/`<desc>` and the legend as text.
- **PNG:** render the export SVG to an `OffscreenCanvas` (or `<canvas>`) at the chosen scale, then `toBlob`. Cap at 8192 px.
- **Print:** a dedicated print route/view (`/planner?print=1` or an in-app print view) using `print.css`. Page size via `@page`. The legend is real HTML text.
- **Text summary:** generated HTML/CSV/Markdown from `PlanTotals` and `HabitatMeasure`.

## Build and deploy
- `npm run build` → `dist/` (static). Cloudflare Pages builds from the `main` branch, and PRs get preview deployments.
- CI (GitHub Actions) on every PR: install (with `npm ci`) → check → unit → build → preview → e2e + axe → Lighthouse CI → licence check. Any failure blocks the merge.
- Dependabot (or Renovate) runs weekly. Security patches merge only after CI passes.

## Browser support
Last two major versions of Chrome, Edge, Firefox and Safari (macOS and iOS), plus Samsung Internet and Chrome on Android. There's no IE. Use `browserslist` to enforce it.
