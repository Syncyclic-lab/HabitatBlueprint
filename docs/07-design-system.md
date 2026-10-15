# 07 · Design system

## Direction: "zoo wayfinding map"
The subject is the printed visitor map you get at a zoo gate: flat colour fields, bold pictograms, colour-coded areas and a legend you can scan in seconds. Kyle's three reference images (`reference/`) are exactly that, made for in-game zoos. The site's identity comes from that world, **not** from CAD software and **not** from generic SaaS.

- **The memorable thing:** the map itself and its area readout. Every other part of the interface stays quiet so the map can be loud.
- **Chrome borrows from zoo signage:** solid colour plates, generous rounding on controls, pictograms, big legible type. It avoids glassy panels, gradients and soft drop shadows.
- **Legibility is part of the look.** The typeface was designed for low-vision readers, and every map edge has a contrast casing. Accessibility isn't a separate mode bolted on.

### What we're deliberately not doing
- No warm cream/terracotta palette, no near-black + acid-green "dev tool" look, no gradient washes.
- No all-caps eyebrow labels above headings. No `→` appended to buttons. No metadata strings glued together with middle dots. Use separate, labelled cells instead (e.g. in the status bar).
- No grid of identical rounded cards. Group content by what it is.
- No decorative animation. The one motion moment is the landing hero (and it obeys reduced motion).

---

## Colour

### UI chrome
| Token | Hex | Use | Contrast checks |
|---|---|---|---|
| `--paper` | `#F2F5EE` | Page and app background (a cool, pale field green, not cream) | Ink on paper 15.27:1 |
| `--surface` | `#FFFFFF` | Panels, dialogs, inputs | Needs a `--line` border (white vs paper is only 1.1:1) |
| `--ink` | `#13201A` | Body text, icons, **map casing**, focus ring | 16.8:1 on white |
| `--ink-muted` | `#4A5A50` | Secondary text, captions | 6.65:1 on paper |
| `--line` | `#7C8A80` | Input borders, panel edges, dividers that carry meaning | 3.29:1 on paper, 3.62:1 on white |
| `--keeper` | `#1E5631` | Primary buttons (white text), links, active tool | 7.85:1 on paper; white on keeper 8.64:1 |
| `--grass` | `#5BAB4E` | Map ground; big colour fields on the landing page. **Never text.** | Ink on grass 5.91:1 |
| `--savanna` | `#DBB34D` | Highlight plates (readout tags, current-tool tint, warnings background) | Ink on savanna 8.46:1 |
| `--danger` | `#B3261E` | Errors, destructive actions | 5.94:1 on paper |
| `--measure` | `#0033CC` | Measure tool lines (with white halo) | 7.53:1 on path colour, 3.15:1 on grass |

**Dark theme** (`prefers-color-scheme: dark` or the in-app setting). The map keeps its colours because it's the content:
| Token | Dark value | Check |
|---|---|---|
| `--paper` | `#14211A` | Text `#E8EFE9` 14.22:1 |
| `--surface` | `#1C2B23` | Text 12.65:1 |
| `--ink` (text) | `#E8EFE9` | |
| `--ink-muted` | `#A9B8AE` | 8.04:1 |
| `--line` | `#6F8577` | 4.2:1 |
| `--keeper` (links/buttons) | `#8FD49A` with `#13201A` text | 9.55:1 / 9.65:1 |
| `--danger` | `#FF8A80` | 7.29:1 |

**`prefers-contrast: more`:** `--ink-muted` → `--ink`, `--line` → `--ink`, patterns on, and the map casing outer stroke widens to 2.5 px.

**`forced-colors: active`** (Windows High Contrast): don't fight it. Chrome uses system colours (`CanvasText`, `Canvas`, `Highlight`, `ButtonText`, `LinkText`). On the map, fills fall back to `Canvas`, outlines to `CanvasText`, selection to `Highlight`, and **patterns become the main way to tell zones apart**. Test this explicitly.

### Map palette
All map colours live in `data/object-types.json` and `data/biomes.json`. They were sampled from the reference images and checked:
- **Casing rule (WCAG 1.4.11):** every filled map shape gets a two-tone outline: outer `#13201A` 1.5 px, inner `#FFF8C9` 1 px, both non-scaling. The dark stroke is ≥ 3:1 against every biome ground (lowest: tropical 3.31:1). The light stroke is ≥ 6.5:1 against the darkest fills (forest, road, plum, slate) and ≥ 3.7:1 against every mid-dark fill (teal, planting, brick, deep water, climbing), so each edge stays visible against whatever it touches, including another habitat on a shared wall.
- **Label/icon ink rule:** text and silhouettes on a fill use whichever of black or white has the higher contrast. The JSON lists it as `ink`, and code should compute it as well, as a guard. Every default fill reaches ≥ 4.5:1 for text.
- Note: the references draw black silhouettes on dark green (#20602A), which is only 2.77:1. Our rule switches those silhouettes to white (7.59:1).
- **Patterns** (diagonal, dots, waves, crosshatch, mesh, …) are defined per type and per area swatch. Type patterns that carry meaning (aviary mesh, water waves, deep water, planting) are **always on**. Themed-area patterns are **on by default** in Clear style at a subtle strength (about 15–20% opacity, still distinguishable). Users can turn them off, and they're forced to full strength under `prefers-contrast: more` and forced colours. So which area a habitat belongs to never depends on colour alone (WCAG 1.4.1). The Objects panel and on-focus labels state it in text too.
- **Map styles:**
  - **Clear** (default; must pass all checks): casing on, labels with halo, white silhouettes on dark fills.
  - **Poster** (opt-in): closer to the reference look (pale outlines only, user-picked custom colours allowed). The UI says it may reduce contrast. Exports remember which style was used. A conforming alternative (Clear) is always one click away.

---

## Typography
- **Atkinson Hyperlegible Next** (Braille Institute, OFL-1.1, variable weight) for everything. It was designed to keep letterforms distinct for low-vision readers (l/I/1, O/0, rn/m), which matters when people are reading numbers and species names off a busy map.
- **Atkinson Hyperlegible Mono** only where digits must line up: numeric inputs, the vertex table and the status bar coordinates. Not for decorative small labels.
- Self-host both via `@fontsource`. Subset to Latin + Latin Extended for now, and include `font-display: swap` with metric-matched fallbacks to avoid layout shift.

**Scale** (major third, 1.25; base 16 px app / 18 px landing body):

| Token | Size | Weight / leading | Use |
|---|---|---|---|
| `--t-display` | `clamp(2.5rem, 4.2vw + 1rem, 4.25rem)` | 800 / 1.05, tracking −0.02em | Landing H1 only |
| `--t-h1` | 2.441rem | 750 / 1.1 | Page titles |
| `--t-h2` | 1.953rem | 700 / 1.15 | Section heads |
| `--t-h3` | 1.563rem | 700 / 1.2 | Sub-sections, panel titles on landing |
| `--t-lead` | 1.25rem | 400 / 1.5 | Landing lead paragraph |
| `--t-body` | 1rem (app) · 1.125rem (content pages) | 400 / 1.55 | Body |
| `--t-small` | 0.875rem | 500 / 1.4 | Captions, helper text (never below 14 px) |
| `--t-readout` | 2rem → 3.5rem on the hero | 700, tabular figures | Area readouts |

- Measure: body text max **68ch**. Left-aligned everywhere, never justified.
- Sentence case for every heading, button and label.
- Units always follow numbers with a non-breaking thin space: `1,842 m²`.

---

## Layout and shape
- Spacing scale (rem): 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6.
- Content pages: a 12-column grid at ≥ 1024 px with the content on 7 columns, left-aligned. The landing hero splits 5 (copy) / 7 (map).
- Radius: controls 8 px (signage-plate feel), panels and dialogs 12 px, map objects use their own geometry (no imposed radius).
- Elevation: **no soft grey shadows.** Separate layers with a 1 px `--line` border. Floating map controls get a 2 px `--ink` border on `--surface`.
- Minimum target size 24 × 24 px. Primary buttons are 44 px tall and tool rail buttons 44 × 44 px.

## Components (key states)
- **Buttons:** primary (keeper/white), secondary (surface + ink border), quiet (text + underline on hover/focus), danger (danger/white). States: default, hover (darken 8%), active, focus, disabled. Disabled controls stay readable at 4.5:1, are explained by adjacent text and keep `aria-disabled` where focusable.
- **Focus indicator** (all interactive elements, including map objects): `outline: 2px solid var(--ink); outline-offset: 2px; box-shadow: 0 0 0 5px #FFFFFF;`. The ink-plus-white pair is visible on paper, white, grass and every fill. In dark mode, swap the pair.
- **Map selection:** dashed 1.5 px ink stroke over a solid 3 px white stroke, which animates (marching ants) only if reduced motion is off. Handles are 10 px white squares with an ink border inside 24 px hit areas. The rotate handle is a circle.
- **Readout tag** (the brand moment): a savanna plate with ink text: name, area at `--t-readout`, "% of map" below. Used in the hero, the drawing readout and the Inspector header.
- **Inputs:** a visible label above, unit in the label, helper text below, and an error below that with an icon and text. Number inputs accept typed values and arrow keys, and validate on blur, never while typing.
- **Tool rail:** icon + visible text label (not icon-only; label below the icon at ≥ 768 px, tooltip-plus-accessible-name below that). The active tool has a keeper background with white icon and text, plus `aria-pressed="true"`.
- **Tabs (right panel):** React Aria Tabs, arrow-key navigation, with manual activation for heavy panels.
- **Dialogs:** native `<dialog>` with `showModal()`. The title is the accessible name, the first field gets focus, `Esc` closes, and focus returns to the trigger.
- **Toasts:** avoid them. Status goes to the status bar and live region. Anything requiring action gets an inline message or a dialog.

## Iconography
- **Facility icons:** start from the **AIGA/DOT symbol signs** (US government work, public domain: restrooms, food, coffee, information, first aid, shops, tickets, and more), redrawn and simplified onto a 24 px grid. Animal-specific symbols we draw ourselves.
- **Animal silhouettes:** draw our own, or use **PhyloPic** images licensed **CC0** or **CC BY** only (check each image's licence; some are non-commercial). Record each in `src/assets/icons/manifest.json` with `{ id, label, author, sourceUrl, licence, modified: true|false }`.
- **Never** trace or copy in-game icons or Frontier artwork (see `10-legal-and-ip.md`).

## Motion
- Landing hero: one sequence, ≤ 5 s, ease-out, with Pause/Replay. Under reduced motion, show the static final state.
- App: only motion that answers an action, e.g. panel slide 150 ms, selection ants (off under reduced motion), and smooth "zoom to" (instant under reduced motion).
- No parallax and no scroll-triggered reveals.

## Imagery on the landing page
Use **live SVG vignettes drawn with the planner's own renderer and palette** (a habitat with water zone, a path junction, a legend block). Don't use screenshots of the game or stock photos. That keeps the page honest and on-brand, and avoids IP problems.
