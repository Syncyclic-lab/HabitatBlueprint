# CLAUDE.md — HabitatBlueprint

You are building **HabitatBlueprint**, an unofficial, free, browser-based planning tool for Planet Zoo 2 players. People use it to lay out habitats, buildings, paths and facilities on a true-scale flat map before building in the game, in Sandbox or Franchise mode.

Two surfaces:
1. **Landing page (`/`)**: explains the tool and links to it.
2. **Planner (`/planner`)**: the map editor.

The site must meet the strictest public-sector web standards we could find (see "Non-negotiables" below). Treat them as acceptance criteria, not nice-to-haves.

> The name (chosen by Kyle on 2026-10-15; the docs' original working name was "Zoo Plotter") lives in **one** constant (`src/config/site.ts` → `SITE_NAME`). Never hard-code it anywhere else. The name must never contain "Planet Zoo" (see `docs/10-legal-and-ip.md`).

---

## Read these before writing code

| When you are… | Read |
|---|---|
| Starting any session | `docs/11-roadmap.md` (find the current milestone), then this file |
| Building anything visual | `docs/07-design-system.md` and the images in `reference/` |
| Building planner tools | `docs/03-planner-tools.md`, `docs/05-data-model.md` |
| Touching map size, units, biomes or game facts | `docs/04-game-data-and-map-scale.md`, `data/*.json` |
| Writing any UI | `docs/08-accessibility.md` (every component) |
| Adding a dependency, header, font, image or icon | `docs/09-privacy-and-security.md`, `docs/10-legal-and-ip.md` |
| Writing landing/static page copy | `docs/02-landing-and-site-pages.md` |
| Writing tests | `docs/12-testing-and-qa.md` |
| Unsure about a product decision | `docs/13-open-questions.md`, then ask Kyle |

---

## Stack (decided — see `docs/06-architecture.md` for the reasoning)

- **Astro 7** (static output) for the landing page and all content pages. Zero client JS on content pages unless a page truly needs it.
- **React 19 + TypeScript (strict)** for the planner, mounted as an Astro island on `/planner` (`client:only="react"`).
- **SVG** for map rendering (accessible DOM, crisp export). No canvas/WebGL unless profiling proves SVG can't hit the performance budget.
- **Zustand** + **immer** for state, with our own labelled snapshot history for undo/redo (`src/planner/store/history.ts`; zundo was dropped because it can't label steps for announcements).
- **polygon-clipping** for unions/intersections; area and perimeter are computed in our own `src/geometry/` module (shoelace formula, meters).
- **Zod** to validate every plan file and share-link on import.
- Native HTML elements first. Use **React Aria** hooks/components (Apache-2.0) for menus, tabs, tree grid and other composite widgets.
- **IndexedDB** (via `idb`) for autosave. No server, no accounts, no cookies.
- **Vitest** (unit), **Playwright + @axe-core/playwright** (E2E + automated accessibility), **Lighthouse CI**.
- Fonts self-hosted from `@fontsource/*` packages (Atkinson Hyperlegible Next and Mono). **Never** load fonts, scripts or styles from a third-party CDN.
- Hosting: **GitHub Pages** for now (Kyle, 2026-10-15), deployed by `.github/workflows/ci.yml`, served under `/HabitatBlueprint/`. Every internal link goes through `withBase()`. GitHub Pages can't send headers, so the CSP is Astro's hashed `<meta>`; the build also writes `dist/_headers` so a later move to **Cloudflare Pages** gets HSTS and `frame-ancestors` for free.
- Node **24 LTS** (`.nvmrc`). Package manager: **npm**. Pin exact versions (`save-exact=true` in `.npmrc`). TypeScript stays on **6.x** until typescript-eslint and `@astrojs/check` support 7.
- The working copy lives at `C:\dev\HabitatBlueprint` (outside OneDrive). npm scripts load `astro.env`, which turns Astro's telemetry off.

Check the current stable versions at scaffold time and record them in `docs/06-architecture.md`. If a version line above has moved on, use the current stable and note it.

---

## Non-negotiables

### Accessibility (WCAG 2.2 AA minimum, plus the extras in `docs/08-accessibility.md`)
- Every planner action must be possible with **keyboard alone** and with **a single pointer without dragging** (WCAG 2.1.1, 2.5.7).
- Every shape's geometry must be **editable as numbers** in the Inspector (x, y, width, height, rotation, vertex table). This is the non-visual and non-drag path, so treat it as a core feature.
- The **Objects panel** is a full text alternative to the map. Anything on the map is listed there with its type, name, area and contents.
- Colour is never the only signal: every zone type also has a pattern, a label and/or an icon.
- Area, save status and errors are announced through a polite live region (WCAG 4.1.3), throttled so screen readers aren't flooded.
- Single-key shortcuts work only while the map has focus, and users can turn them off or remap them (WCAG 2.1.4).
- Targets are at least 24×24 CSS px, including vertex handles' hit areas (WCAG 2.5.8).
- Respect `prefers-reduced-motion`, `prefers-contrast`, `prefers-color-scheme` and `forced-colors`.
- A PR that adds UI without keyboard support, accessible names and an axe-clean Playwright test is **not done**.

### Privacy
- **Collect nothing.** No analytics, cookies, fingerprinting, third-party requests, accounts or server storage.
- Plans live in the user's browser (IndexedDB) and in files the user downloads. Share links put the plan in the URL **fragment** (`#…`) so it never reaches the server.
- Tracing images the user imports stay on their device. Never upload them.

### Security
- Strict CSP with no `unsafe-inline` or `unsafe-eval`. Use Astro's CSP API for hashes. HSTS, `nosniff`, `frame-ancestors 'none'` and the full header set from `docs/09-privacy-and-security.md`.
- Treat every imported file and share link as hostile: size-limit it, parse it with Zod and reject unknown fields. Never use `dangerouslySetInnerHTML`, and escape user text in SVG exports.

### Legal / IP
- **No Frontier assets of any kind**: no logos, screenshots, game icons, UI art, fonts, audio, data-mined files or ripped models.
- Animal silhouettes and facility icons are drawn **by us** or come from **CC0 / CC BY** sources, with every icon's source and licence recorded in `src/assets/icons/manifest.json` and shown on `/credits`.
- Dependencies must use permissive licences (MIT, ISC, BSD, Apache-2.0, 0BSD, CC0; OFL-1.1 for fonts). CI fails on anything else.
- The non-affiliation disclaimer appears in the site footer on every page (exact text in `docs/10-legal-and-ip.md`).

### Game facts
- **Species list:** `data/species.json` holds all 136 PZ2 species (name, scientific name, enclosure kinds, regions, class, edition) from the official Zoopedia. Space-requirement numbers are **not** bundled; they stay user-entered until the legal review (Kyle, 2026-10-15).
- **Map size is data, not code.** Read it from `data/maps.json`. The default 1000 × 1000 m figure has **not yet been verified in Planet Zoo 2** (`"verified": false`). Never hard-code `1000`, and keep the UI working for any width × height.
- Every game fact in `data/` carries a `source` and `verified` flag. Don't add game facts without both.

---

## Units and geometry conventions
- World units are **meters**. Origin `(0,0)` is the **top-left (north-west)** corner of the map; +x is east, +y is south. This matches SVG.
- Store coordinates rounded to **0.01 m**. Display areas rounded to **1 m²**, lengths to **0.1 m**.
- Areas are planar (shoelace). Curves (ellipses, smoothed paths) are flattened to polygons with a max chord error of 0.05 m before measuring.
- "Total planned area" uses the **union** of shapes, so overlaps are never double-counted.
- Format numbers with `Intl.NumberFormat` (en-US default). Show m² always, and add hectares once a value passes 10,000 m². Imperial (ft², acres) is an opt-in display toggle; storage is always metric.

---

## Code conventions
- `src/geometry/` is pure TypeScript with no React or DOM. It needs 100% branch coverage because the area numbers are the product.
- Components: one per file, named exports, props typed and documented. Prefer native HTML elements (`<button>`, `<dialog>`, `<fieldset>`) over ARIA re-creations.
- All user-facing strings go in `src/i18n/en.ts` (English only for now, but nothing is hard-coded in components). Long-form page prose (Help, Privacy, Terms, the accessibility statement and report) lives in `src/i18n/en-content.ts`, which only Astro pages import, so it never ships in the planner bundle.
- Import Zod from `src/lib/zod.ts` (it switches off Zod's `new Function` probe, which the CSP would report).
- Use sentence case in the UI. Name controls for what the user is doing ("Draw habitat"), not how the system works.
- No `any`. No default exports except Astro pages. No barrel files that break tree-shaking.
- Commit with Conventional Commits (`feat:`, `fix:`, `a11y:`, `docs:`…).

## Commands (create these in Milestone 0)
```
npm run dev          # Astro dev server
npm run build        # static build to dist/
npm run preview      # serve dist/ locally with production headers
npm run check        # astro check + tsc --noEmit + eslint + prettier --check
npm run test         # vitest
npm run test:e2e     # playwright (includes axe scans)
npm run test:a11y    # playwright --grep @a11y
npm run lhci         # lighthouse CI against preview
npm run licenses     # fail on non-allowlisted dependency licences
```

## Definition of done (every milestone)
1. `npm run check`, `test`, `test:e2e`, `licenses` and `build` all pass.
2. axe reports **0 violations** on every page and planner state touched.
3. The milestone's keyboard-only E2E script passes (see `docs/12-testing-and-qa.md`).
4. No CSP violations in the browser console during E2E.
5. `docs/11-roadmap.md` is updated: tick the boxes and note anything deferred.

## Working with Kyle
- Kyle is a civil engineer, not a front-end developer. Explain choices in plain terms and keep summaries short.
- Ask before adding a dependency over ~30 kB gzipped, changing the stack, or changing anything in "Non-negotiables".
- If a game fact is uncertain, say so and leave it flagged rather than guessing.

## Environment note
This folder may sit inside **OneDrive**. Syncing `node_modules` causes `EPERM` and file-lock errors on Windows. Before running `npm install`, check the path. If it's under OneDrive, stop and ask Kyle to move the project (e.g. `C:\dev\zoo-plotter`) or confirm that OneDrive is excluded.
