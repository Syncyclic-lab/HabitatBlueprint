# 11 · Roadmap

Work top to bottom. A milestone is done only when every box is ticked **and** the Definition of Done in `CLAUDE.md` passes. Tick boxes as you go, and add a dated line under "Log" for anything deferred or changed.

**Current milestone:** M0

---

## M0 · Foundation
- [x] Copy `setup/claude-commands/*.md` into `.claude/commands/` (if not already there)
- [x] Check the folder isn't syncing `node_modules` through OneDrive (see CLAUDE.md "Environment note"). Confirm the location with Kyle
- [x] `git init`, `.gitignore`, `.editorconfig`, `.nvmrc` (24), `.npmrc` (`save-exact=true`, `engine-strict=true`)
- [x] Scaffold Astro 6 (static) + React integration + TypeScript strict. Record pinned versions in `06-architecture.md`
- [x] ESLint (incl. `eslint-plugin-jsx-a11y`, `eslint-plugin-astro`), Prettier, `astro check`, `npm run check`
- [x] Vitest with coverage. Playwright with `@axe-core/playwright`. A sample `@a11y` test
- [x] `src/config/site.ts`, `src/i18n/en.ts`, `src/styles/tokens.css` (all tokens from `07-design-system.md`), `base.css`
- [x] Self-hosted Atkinson Hyperlegible Next + Mono via `@fontsource`. Licence file in repo
- [x] `BaseLayout.astro`: skip link, header nav, `<main id="main">`, footer with disclaimer and links. Unique `<title>` pattern
- [x] Empty pages for every route in `02-landing-and-site-pages.md`, each with an H1
- [x] `public/_headers` with the full header set. Decide and implement the CSP hash strategy (`09-privacy-and-security.md`)
- [x] E2E guards: no CSP violations, no third-party requests, no cookies
- [x] `npm run licenses` with the allowlist from `10-legal-and-ip.md`
- [x] Zod schemas for `/data/*.json`. The build fails on invalid data
- [x] GitHub Actions CI running everything in the Definition of Done
- [ ] **Accept:** all pages render, axe shows 0 violations, Lighthouse accessibility 100 and best-practices ≥ 95, CSP clean

## M1 · Landing and content pages
- [x] Landing page per `02-landing-and-site-pages.md` (copy, layout, responsive 320 → 1920 px)
- [x] Hero demo island: static SVG fallback, ≤ 5 s sequence, Pause/Replay, reduced motion
- [x] `/help` skeleton with "About map size and area accuracy" (with the unverified notice)
- [x] `/accessibility` statement draft ("Partially conforms" until M8)
- [x] `/privacy`, `/terms` (marked "draft for legal review"), `/credits` (generated), `/404`
- [x] `security.txt`
- [ ] **Accept:** landing LCP < 2.5 s on simulated mid-tier mobile, CLS < 0.1, total JS on `/` < 30 kB gz, 0 axe violations, keyboard and screen-reader smoke test of every page

## M2 · Planner shell and true-scale map
- [ ] `/planner` island. Layout regions per `03-planner-tools.md` §1, F6 cycling
- [ ] Store slices: plan, view, tool, selection, prefs
- [ ] SVG viewport reading the map size from `maps.json`: ground colour from biome, boundary, grid (auto-thinning), scale bar, north arrow
- [ ] Pan/zoom: wheel, pinch, keyboard, buttons, fit, minimap (click to jump)
- [ ] Status bar: cursor coordinates (m), zoom, grid, snap, map area, planned area
- [ ] New plan dialog (name, mode, biome, preset). Map settings dialog (biome, grid, units, style, patterns, shortcuts on/off)
- [ ] Live announcer (polite + assertive, throttled)
- [ ] Responsive behaviour < 1024 px and < 640 px
- [ ] **Accept:** the scale bar reads correctly at every zoom (unit test against `maps.json`), 60 fps pan/zoom on an empty map, keyboard-only E2E covers create plan → pan → zoom → change grid, 0 axe violations

## M3 · Geometry core, habitat tool, area readouts (Kyle's headline feature)
- [ ] `src/geometry/`: shoelace area, perimeter, flatten (ellipse/rounded/smooth), clip to map, union/intersection (polygon-clipping), self-intersection check, point-in-polygon, resize-to-area. **100% branch coverage** + property tests
- [ ] Habitat tool: polygon, rectangle, ellipse. Pointer + keyboard crosshair + "Add habitat by size…"
- [ ] Live readouts while drawing (follows cursor without covering it, status bar mirror, throttled announcements)
- [ ] On completion: Inspector shows total, land, water, deep water, perimeter, % of map, % of planned zoo
- [ ] Water and deep-water sub-zones, clipped to the habitat
- [ ] "Show areas on map" labels
- [ ] Inspector numeric geometry editing incl. vertex table. "Resize to area…"
- [ ] Objects panel (decide tree grid vs nested lists after a quick NVDA + VoiceOver check)
- [ ] Undo/redo (≥ 200 steps, labelled). Autosave to IndexedDB. Plans list (open, duplicate, rename, delete)
- [ ] **Accept:** the area cases in `03-planner-tools.md` §3.1 pass to the stated precision. The keyboard-only E2E "draw a 50 × 40 m habitat, add a pond, read the land area" passes. Totals for 150 objects compute in < 16 ms

## M4 · The rest of the MVP drawing kit
- [ ] Select/move/rotate/resize with handles + keyboard + dialogs (Move by…). Multi-select, marquee, duplicate, delete, mirror, z-order, lock/hide
- [ ] Snapping: grid, vertex, edge, angle, guides, Alt to suspend. Shared-wall detection
- [ ] Building tool (types from `object-types.json`)
- [ ] Path tool (types, widths, smooth, round/flat caps, union rendering, length + area). Plaza mode
- [ ] Water tool. Icon tool (facility icons, screen/map sizing). Label tool. Measure tool (distance, area)
- [ ] Context menu (right-click, Shift+F10, ⋯ button)
- [ ] Shortcuts dialog (`?`). Remap/disable single-key shortcuts
- [ ] JSON save/open (validated) and "Delete all my data"
- [ ] **Accept:** the path area test cases pass. Every tool has a keyboard-only E2E. A 150-object fixture plan pans at 60 fps. 0 axe violations across 12 planner states

## M5 · Zoo content: areas, animals, requirements, stats
- [ ] Themed areas + area palette + patterns (subtle by default)
- [ ] Animals per habitat (♂/♀/juveniles), silhouettes with auto black/white ink, accessible names
- [ ] Species library (user-entered) + requirement check with buffer % (tests from `species-requirements.example.json`)
- [ ] Aviary flying area. Climbing and shelter zones
- [ ] Barriers on habitats (type, grade, edge overrides, viewing edges). Free-standing barrier tool
- [ ] Stats panel (tables with "view as table" for charts). Checks panel with "Go to"
- [ ] Planting tool. Boolean shape ops. Align/distribute/array. Build phases + phase filter
- [ ] **Accept:** the requirement maths matches the fixtures. The Checks panel finds the seeded problems in the test plan. Screen-reader task "find which habitat is too small and fix it" passes

## M6 · Legend, export and sharing
- [ ] Legend generator in the reference poster's structure (area blocks → categories → species, plus a Guest services block). Title block with zoo name, subtitle and local logo
- [ ] Clear/Poster styles
- [ ] PNG (1×/2×/4×, ≤ 8192 px), SVG (title/desc/text legend, escaped text), print poster (Letter, Tabloid, A3, A2 landscape)
- [ ] Text summary export (HTML/CSV/Markdown)
- [ ] Share link (fragment, lz-string, size warning, "save a copy" on open)
- [ ] **Accept:** the export of the fixture plan visually matches the layout of `reference/example-3-full-poster-with-legend.png` (Kyle signs off). SVG passes an XSS fuzz test (names with `<script>`, `&`, quotes). Share link round-trips losslessly

## M7 · Tracing underlay and templates
- [ ] Import image (local only), opacity, lock, hide, two-point and four-corner calibration
- [ ] Optional inclusion in file export (re-encoded, EXIF stripped). Never in share links
- [ ] Starter templates: roundabout with fountain, entrance plaza, exhibit house, standard habitats
- [ ] Snapshots (named versions, restore)
- [ ] **Accept:** calibrating a 500 m known distance gives < 0.5% scale error. Image bytes never appear in any network request

## M8 · Hardening and launch
- [ ] Full manual WCAG 2.2 A/AA audit (Trusted Tester-style) of every page and the planner flows. Fix everything
- [ ] Assistive technology matrix runs (see `12-testing-and-qa.md`). Forced colours. 400% zoom. Text spacing
- [ ] Performance budget pass. Security review checklist (`docs/security-review.md`). Trusted Types trial
- [ ] Licence audit. Icon manifest complete. `/credits` correct
- [ ] ACR (VPAT INT edition) published. Accessibility statement updated to the audited status and date
- [ ] Legal: lawyer review of `/terms`, and Frontier contacted (see `10-legal-and-ip.md`)
- [ ] Map size verified in-game (`04-game-data-and-map-scale.md` §1.1), or the unverified notice is still visible
- [ ] Domain, HSTS preload submission, Cloudflare Pages production deploy, security headers verified on the live URL
- [ ] **Accept:** 0 known WCAG A/AA failures. All E2E green on the production URL. Kyle signs off

## After launch (P3 backlog)
Coverage rings · guest route distance · staff-access check · user-saved templates · starter species list (after legal review) · Wildlife Reserve map type · localisation · snapshot compare view.

---

## Log
- 2026-10-15 · Kit prepared. Map size defaults to 1000 × 1000 m, **unverified** for PZ2.
- 2026-10-15 · M0 + M1 built. Repo `Syncyclic-lab/HabitatBlueprint`, working copy `C:\dev\HabitatBlueprint`. Name: HabitatBlueprint. Hosting: GitHub Pages under `/HabitatBlueprint/` (Cloudflare later); CSP is a hashed `<meta>` per page + header policy in `dist/_headers` (see 09). Astro 7.4 (not 6) and TypeScript 6.0 (TS 7 not yet supported by the lint/check tools). `eslint-plugin-jsx-a11y-x` replaces `eslint-plugin-jsx-a11y` (ESLint 10 support). Added `data/species.json` (all 136 PZ2 species from the official Zoopedia, no requirement numbers). Long-form page prose lives in `src/i18n/en-content.ts`.
- 2026-10-15 · Deferred: Firefox and Lighthouse can't launch on Kyle's PC under the agent sandbox ("spawn UNKNOWN"); both run in CI. The M0/M1 **Accept** boxes stay open until the first CI run shows Lighthouse scores. Chromium and WebKit E2E pass locally (78 tests).
