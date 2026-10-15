# 03 · Planner tools and behaviour

This is the functional spec for `/planner`. Each tool has a **phase tag**:
- **[MVP]**: needed for launch, built in Milestones 2–4
- **[P2]**: launch scope, built in Milestones 5–7
- **[P3]**: after launch (keep the data model ready for it, don't build it yet)

Every tool must document its **three input paths** (pointer · keyboard · typed numbers) and its **readouts**. If a tool can't offer all three, it isn't finished.

---

## 1. Planner layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ☰ Crystal Ridge Zoo ▾   ↶ Undo  ↷ Redo   Saved ✓   Export ▾   Map settings  ? │  ← top bar
├────────┬──────────────────────────────────────────────────┬──────────────────┤
│ Select │                                                  │ [Inspector]      │
│ Habitat│                                                  │  Objects         │
│ Build- │            MAP VIEWPORT (SVG)                    │  Areas & legend  │
│  ing   │   grid · scale bar · north arrow                 │  Stats           │
│ Path   │                                                  │  Checks          │
│ Barrier│                                    ┌──────────┐  │                  │
│ Water  │   + − ⤢ (zoom in / out / fit)      │ minimap  │  │                  │
│ Plant- │                                    └──────────┘  │                  │
│  ing   │                                                  │                  │
│ Icon   │                                                  │                  │
│ Label  │                                                  │                  │
│ Measure│                                                  │                  │
├────────┴──────────────────────────────────────────────────┴──────────────────┤
│ x 412.5 m  y 288.0 m │ 35% │ Grid 5 m │ Snap on │ Map 1,000,000 m² │ Planned 48,210 m² (4.8%) │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Landmarks:** top bar = `<header>`, tool rail = `<nav aria-label="Tools">` (a toolbar with roving tabindex), map = labelled region, right panel = `<aside>` holding tabs, status bar = `role="status"` region (its contents are not announced on every change; see §2.8).
- **F6 / Shift+F6** cycle focus between the five regions.
- **Below 1024 px wide:** the right panel becomes a bottom sheet with the same tabs. **Below 640 px:** the tool rail becomes a horizontal scrolling toolbar above the map, and the status bar collapses to the area totals. No horizontal page scrolling at 320 px (only the map itself pans).
- Panels never cover the focused object. When focus moves to an object behind a panel, the map pans to reveal it (WCAG 2.4.11).

---

## 2. Global behaviour

### 2.1 The map
- Drawn at true scale from `data/maps.json` (`widthM` × `heightM`). The boundary is visible, and objects can't be placed outside it (vertices clamp to the edge).
- The ground colour comes from the chosen biome (`data/biomes.json`). The map is flat, with no elevation.
- **Grid:** minor and major lines. Sizes 0.5, 1, 2, 5, 10, 25, 50 or 100 m (default 5 m minor, 50 m major). The grid auto-thins when lines would be closer than 6 px on screen.
- **Scale bar** (auto-picks 1/2/5 × 10ⁿ m) and **north arrow**, always visible.
- **Minimap** shows the whole map and the current viewport rectangle. Click or press Enter on it to jump. It can be hidden.
- **Zoom:** 0.05 px/m → 40 px/m. Controls: wheel/pinch, `+`/`−`, zoom buttons, "Fit map" (`0`), "Zoom to selection" (`Shift+2`). Zoom % is shown in the status bar.
- **Pan:** Space+drag, middle-drag, two-finger drag, scrollbars on the viewport, `Ctrl+Arrow` keys, or clicking the minimap. Pan never requires dragging (minimap click and keyboard both work).

### 2.2 Units and readouts
- Storage is metric. Display: m² and m by default, plus ha once ≥ 10,000 m². Optional imperial display (ft², acres, ft) in Map settings.
- "% of map" = object area ÷ map area. "Planned area" = area of the **union** of every object that occupies ground (habitats, buildings, plazas, paths, water, planting). Labels, icons and measures are excluded.
- **Show areas on map** (default on): each habitat's on-map label shows its name and area. The label scales with zoom and hides below a readable size, but the Objects panel always has the value.

### 2.3 Snapping
- Snap targets: grid · existing vertices · existing edges (including midpoints) · 15° angle steps (configurable 5/10/15/30/45) · alignment guides (match the x/y of nearby vertices).
- **Shared walls:** a new habitat edge that snaps along an existing habitat edge is recorded as shared. Barrier length totals count shared edges once.
- Hold `Alt` to disable snapping temporarily. The status bar shows "Snap on/off" and a toggle.
- Snap indicators are drawn with the selection colours (see `07-design-system.md`) and announced in the live region only when a vertex is placed ("snapped to vertex of Elephant habitat").

### 2.4 Selection and transforms [MVP]
| Action | Pointer | Keyboard | Typed |
|---|---|---|---|
| Select | Click; Shift+click to add | Tab/Shift+Tab through objects in the map (in z-order); or select in the Objects panel | — |
| Select many | Marquee drag on empty ground | `Ctrl+A`; Objects panel checkboxes | — |
| Move | Drag | Arrows = 1 grid step; Shift+Arrows = 10 steps; Alt+Arrows = 0.1 m | Inspector x/y; "Move by…" dialog (Δx, Δy) |
| Rotate | Rotate handle | `[` / `]` = −/+ 15° (Shift = 1°) | Inspector rotation (°) |
| Resize | Corner/edge handles (Shift = keep ratio) | `,` / `.` = shrink/grow 5% (Shift = 1%) | Inspector width/height; **Resize to area…** (see 3.1) |
| Edit vertices | Double-click shape | `Enter` on a selected shape → vertex mode; Tab/Shift+Tab between vertices; arrows move; `Insert` adds after; `Delete` removes; `Esc` exits | Inspector vertex table (editable x/y rows; add/remove row buttons) |
| Duplicate | Alt+drag | `Ctrl+D` (offset by 1 grid step) | — |
| Delete | Context menu | `Delete` / `Backspace` | — |
| Mirror | Context menu | `Shift+H` / `Shift+V` | — |
| Order | Context menu | `Ctrl+]` / `Ctrl+[` with Shift for front/back | Objects panel "Move up/down" buttons |
| Lock / hide | Objects panel icons | `Ctrl+L` / `Ctrl+Shift+H` | — |

- The selection outline uses the double "marching ants" stroke (light + dark), with ≥ 24×24 px handle hit areas.
- A **context menu** opens with right-click, `Shift+F10` or the Menu key. It's a real menu (`role="menu"`) with arrow-key navigation.

### 2.5 History and saving [MVP]
- Undo/redo: `Ctrl+Z` / `Ctrl+Shift+Z` (and `Ctrl+Y`), plus toolbar buttons. At least 200 steps. A whole drag is one step.
- Autosave to IndexedDB, debounced 1 s after the last change. The status bar shows "Saving…" then "Saved". Never use a modal.
- **Snapshots [P2]:** named versions ("Before the Asia expansion") that you can restore or compare side by side.

### 2.6 New plan flow [MVP]
A "New plan" dialog (native `<dialog>`) with:
- Zoo name (required, ≤ 60 chars)
- Mode: Sandbox / Franchise (radio)
- Biome (radio cards with ground colour swatch **and** name)
- Map preset (only matters if `maps.json` lists more than one size)
- "Create plan" button

The empty map then shows an inline prompt in the viewport (not a coach-mark overlay): "Draw your first habitat (H), or add one by size." It includes an **Add habitat by size** button.

### 2.7 Units of interaction for touch [MVP]
Tap places vertices. Pinch zooms and two-finger drag pans. Long-press is never the **only** way to do anything. The context menu also opens from a ⋯ button on the selection.

### 2.8 Announcements (live region)
One polite live region, owned by the planner shell, throttled to **one announcement per 750 ms**. The latest message wins. Announce:
- tool changes ("Habitat tool, polygon. Press Enter to place points.")
- vertex placement ("Point 3 at 120, 340 meters. Area so far 1,240 square meters.")
- shape completion ("Habitat 4 created. 1,842 square meters, 0.18 percent of the map.")
- save errors (assertive, the only assertive messages)
- undo/redo ("Undid: move Elephant habitat")

Don't announce cursor coordinates continuously. The status bar shows those, and users can query them with `Ctrl+I` ("Where am I").

---

## 3. Tools

### 3.1 Habitat tool, `H` [MVP]
Draws an animal space. A **Kind** option sits in the tool's options bar: **Habitat** (default) · **Aviary** · **Aquarium** · **Exhibit**. Kind can be changed later in the Inspector.

**Shape modes** (options bar, or `1`–`4` while the tool is active):
1. **Polygon** [MVP]: click to place points. Click the first point, double-click, or press `Enter` to close. `Backspace` removes the last point and `Esc` cancels.
2. **Rectangle** [MVP]: click one corner, then click the opposite corner (dragging also works). Shift = square.
3. **Ellipse** [MVP]: click centre, then click a radius point. Shift = circle.
4. **Freehand** [P2]: drag a lasso. The result is simplified (Ramer–Douglas–Peucker, tolerance 0.5 m) into an editable polygon.

**Corner rounding** [P2]: a `cornerRadiusM` option on polygons and rectangles, giving the soft-cornered habitats seen in the reference images. Corners are flattened before measuring, so area stays exact.

**Keyboard drawing (all shape modes):** when the map has focus and a drawing tool is active, a **crosshair cursor** appears at the viewport centre. Arrows move it by one grid step (Shift ×10, Alt 0.1 m), `Enter`/`Space` places a point, and `Ctrl+I` announces position. Rectangles and ellipses take two points, so they work the same way.

**Typed creation, "Add habitat by size…"** [MVP]: a dialog with shape (rectangle/ellipse/regular polygon with n sides), **target area (m²)**, aspect ratio (or width + height), and rotation. The habitat is placed at the viewport centre (or a typed x/y), then selected so it can be nudged into place.

**Resize to area…** [MVP]: on any closed shape, enter a target area. The shape scales uniformly about its centroid. For rectangles you can choose "keep width" or "keep height".

**Readouts:**
- *While drawing* (follows the cursor, offset so it never covers the crosshair or the last point; also mirrored in the status bar): area so far, perimeter so far, % of map.
- *On completion:* the habitat is selected, the Inspector opens on it, and the live region announces the result.
- *Inspector "Size" group* (all read-only, recomputed live):
  - Total area · Land area · Water area · Deep water area · Climbing area · Flying area (aviaries) · Perimeter (= barrier length) · % of map · % of planned zoo
- *Status bar:* map area and planned totals update instantly.

**Sub-zones** [MVP for water/deep water, P2 for the rest]: with a habitat selected, "Add zone ▾" offers **Water**, **Deep water**, **Climbing area**, **Shelter footprint** [P2] and **Flying area** [P2, aviaries]. Zones are drawn with the same shape modes and are **clipped to the habitat outline**. Accounting:
- Water (reported) = area of union(water, deep water)
- Deep water (reported) = area of union(deep water)
- Land = total − water (reported)
- Climbing is reported separately and does not reduce land
- Flying (aviaries) defaults to the full aviary area unless flying zones are drawn
- These accounting rules are our planning model. Whether they match how Planet Zoo 2 counts is **unverified**; see `04-game-data-and-map-scale.md` §4.

**Barrier on a habitat** [P2]: the Inspector picks a barrier type (from `data/barriers.json`) for the whole outline. Individual edges can be overridden, e.g. a glass viewing edge. Each edge also has a "viewing edge" flag that draws a guest-viewing tick pattern.

**Acceptance (MVP):**
- [ ] A 50 × 40 m rectangle reads exactly **2,000 m²**, **180.0 m** perimeter and **0.20%** of a 1,000,000 m² map.
- [ ] A circle with r = 10 m reads **314 m²** (flattening error < 0.1%).
- [ ] An L-shaped polygon (0,0)(30,0)(30,10)(10,10)(10,30)(0,30) reads **500 m²**.
- [ ] Self-intersecting polygons can't be completed. The live region says why, and the offending segment is highlighted.
- [ ] A habitat, its water zone and its land figure all update within 100 ms while a vertex is being dragged.
- [ ] The whole flow is completable by keyboard only, verified in E2E.

### 3.2 Building tool, `B` [MVP]
Footprints for structures. Shape modes match the habitat tool. **Type** (sets default colour and icon from `data/object-types.json`): Animal house (indoor exhibits) · Guest building · Shop · Restaurant / food · Drinks · Restrooms · Information · Staff facility · Research / education · Quarantine / vet · Entrance · Transport station · Other.
- Exhibits and aquariums can sit **inside** an animal house. Nesting is visual only; areas are not subtracted.
- Readouts: footprint area and % of map.

### 3.3 Path tool, `P` [MVP]
Polylines with width.
- **Type:** Guest (default) · Staff · Queue · Elevated (dashed casing) · Road (darker, like the reference images' perimeter road) · Transport ride line [P2].
- **Width:** 1–20 m. The default and allowed widths come from `data/object-types.json`. A note says PZ2 path widths are unverified.
- Click to place points. Enter or double-click ends the path, and clicking an existing path end continues it. Keyboard crosshair drawing works as in 3.1.
- **Smooth** toggle: Catmull–Rom curve through the points, flattened for measuring.
- Readouts: length (m) and paved area. Area is computed as the union of buffered segments with round joins, so crossings aren't double-counted.
- Same-type paths that cross are drawn as one surface (rendered as a union) so junctions look clean, as in the reference images.
- **Acceptance:** a straight 100 m guest path at 4 m width reads **100.0 m** and **≈ 412.6 m²** (100 × 4 plus round end caps of π·2² = 12.57 m²). End caps are **round** by default; switching to a **flat** cap reads exactly **400 m²**. Write tests for both.

### 3.4 Plaza tool (part of Path tool, mode "Area") [MVP]
Open paved areas such as entrance plazas, roundabout rings and viewing decks. Closed shapes with the plaza colour. Readouts: area.

### 3.5 Barrier tool, `F` (fence) [P2]
Free-standing barrier lines that aren't habitat outlines (e.g. a guest-area wall). Type from `data/barriers.json`, with grade shown. Readouts: length, plus totals by barrier type and grade in Stats.

### 3.6 Water tool, `W` [MVP]
Ponds, lakes and fountains outside habitats. Inside a habitat, use sub-zones instead. Readouts: area.

### 3.7 Planting tool, `G` [P2]
Foliage and landscaping zones, drawn as a pattern fill so they never read as habitats. Readouts: area. Tree stamps live in the Icon tool.

### 3.8 Icon tool, `I` [MVP for facility icons, P2 for animal silhouettes]
Places a symbol at a point.
- **Facility icons:** restrooms, food, drinks, gift shop, information, first aid, staff, entrance, exit, transport stop, viewing point, education talk, bench, photo spot, trash, ATM.
- **Animal silhouettes** (P2): also placed automatically when animals are added to a habitat (see 4.3).
- Icons can be **screen-fixed** (constant size, default) or **map-scaled** (set in meters).
- Every icon has an accessible name (its label), and the Objects panel lists it with its location.
- Icon art rules: `10-legal-and-ip.md` §3.

### 3.9 Label tool, `T` [MVP]
Text on the map: free text, size (screen-fixed or map-scaled), rotation, optional leader arrow [P2]. It uses the system's map label style with a halo for contrast (see `07-design-system.md`). Labels are plain text and are never rendered as HTML.

### 3.10 Measure tool, `M` [MVP]
- **Distance:** click points to measure a multi-segment length. It shows each segment and the total. `Enter` keeps it as a measure object and `Esc` discards it.
- **Area:** a temporary polygon whose area is shown and not saved unless kept.
- **Coverage rings** [P3]: a circle of radius r around facility icons, to check for example that guests are never more than 80 m from a restroom.
- **Route distance** [P3]: shortest guest-path distance between two points (graph over guest paths), e.g. entrance → elephant house.

### 3.11 Tracing underlay [P2, Milestone 7]
Import your own top-down screenshot to trace over (PNG/JPEG/WebP, ≤ 25 MB; decoded locally; never uploaded).
- **Calibrate scale:** click two points on the image and type the real distance between them, or map the image's four corners to the four map corners.
- Opacity slider, lock, hide, and send to the bottom layer.
- Stored in IndexedDB. **Excluded from share links.** Optional in JSON export (the user chooses).
- Optional description field (used as alt text if exported).

### 3.12 Templates / blueprints [P2 starter set, P3 user-saved]
Insert ready-made groups at the viewport centre: roundabout with fountain, entrance plaza with gate buildings, 2×3 exhibit house, square habitats at common target sizes. Users can save any selection as their own template [P3].

### 3.13 Boolean shape operations [P2]
Union, subtract and intersect two selected closed shapes (e.g. notch a habitat around a building). The result is an editable polygon, possibly with holes.

### 3.14 Align, distribute and array [P2]
Align left/centre/right/top/middle/bottom, distribute horizontally/vertically, and linear or grid array (n copies at spacing d). All are buttons in the Inspector when several objects are selected, so they're keyboard reachable.

### 3.15 Build phases [P2]
Each object has a `phase` number (default 1). A **phase filter** ("Show up to phase N") greys out later phases. Stats can be filtered by phase. Franchise players plan what to build first with this.

---

## 4. Panels

### 4.1 Inspector [MVP]
Context-sensitive form for the selection. Every field is a labelled `<input>` with units in the label ("Width (m)"), and range errors appear inline (WCAG 3.3.1/3.3.3).
- **General:** name, kind/type, themed area (select), phase [P2], notes, locked, hidden.
- **Geometry:** x, y (of bounding box top-left), width, height, rotation; vertex table for polygons; radius for circles; corner radius [P2].
- **Size (read-only):** see 3.1.
- **Animals** (habitats only; see 4.3).
- **Barrier** [P2] (habitats and barrier lines).
- **Style overrides** [P2]: fill and pattern from the accessible palette only (custom hex allowed in "Poster" style, with a contrast warning).

### 4.2 Objects panel [MVP]: the text alternative to the map
A tree grid (or nested lists with buttons if a tree grid tests poorly with screen readers; decide in M3 after SR testing):
```
Name                     │ Type       │ Size       │ Animals  │ Status
▾ African grasslands     │ Area       │ 18,240 m²  │ 6 habs   │
   ▸ Elephant habitat    │ Habitat    │ 4,120 m²   │ ♂1 ♀5    │ ✓ Fits
   ▸ Giraffe habitat     │ Habitat    │ 3,300 m²   │ ♂1 ♀3    │ ⚠ 140 m² short
▾ Unassigned             │            │            │          │
   ▸ Main path           │ Guest path │ 412 m long │          │
```
Columns are real grid columns with headers, not text joined into one string.
- Selecting a row selects the object on the map, and vice versa.
- Row actions: rename, go to (pan/zoom), duplicate, delete, move up/down, lock, hide.
- Filter by type, area or phase, and search by name or species.
- Sort by name, area or type.

### 4.3 Animals (inside the Inspector) [P2]
- Add species: a name with autocomplete from the user's **species library** (4.6).
- Counts: **males**, **females**, juveniles (optional).
- On-map: silhouette (from the icon manifest; a generic paw if none) + count badges, as in the references ("♂ 1 ♀ 5"). Badges use **symbol + number**, and the accessible name is "1 male, 5 female". Colour (blue/pink) is only a secondary cue.
- Silhouette colour switches between black and white automatically so it keeps ≥ 3:1 contrast with the fill.

### 4.4 Areas & legend [P2]
- Create themed areas (e.g. "African grasslands", "Asia house", "Aquarium building"), each with a name and a colour from the area palette. Any object can belong to one area.
- **Legend preview:** auto-generated in the reference poster's structure. One block per area, coloured header, species grouped by category (Herbivores, Predators, Primates, Birds, Reptiles, Fish, Other), each with silhouette + name. A **Guest services** block lists facility icons in use.
- Species category comes from the species library (default "Other").
- **Title block:** zoo name, optional subtitle, optional logo (the user's own image, stored locally).

### 4.5 Stats [P2] (basic totals are MVP in the status bar)
- Map area · planned area · free area · % used
- Area by object type (table + bar chart following the dataviz rules: direct labels, no colour-only meaning)
- Habitats table: name, kind, total, land, water, deep, climbing, animals, requirement status
- Path length by type · barrier length by type and grade
- Animal census: species × ♂/♀/juv
- Every table is a real `<table>` with `<caption>` and `<th scope>`. Charts have a "View as table" toggle.

### 4.6 Species library [P2]
The user's own list of species and their requirements (fields in `05-data-model.md`). Sources:
- **Entered by the user** (default; the requirement check works with these alone).
- **Starter list** [P3, gated on legal review in `10-legal-and-ip.md` §4]: an optional, clearly labelled, independently compiled reference list. Every value is marked unverified until confirmed.

**Requirement check:** for each habitat, required area per space type = `base + max(0, count − includedInBase) × perExtra`, then × (1 + buffer). Default buffer 10%, adjustable 0–50%. Status per habitat: ✓ fits / ⚠ short by N m² / – no requirement data. Status is shown with **icon + text**, never colour alone.

> The formula above is a planning assumption. Players should confirm against the in-game Zoopedia. The `includedInBase` field exists because we don't yet know whether the base figure covers one animal or the minimum group. See open question Q7.

### 4.7 Checks [P2]
A list of warnings, each with a "Go to" button:
- habitats overlapping each other
- habitat short on area (from 4.6)
- habitat with no animals, or animals with no habitat
- aquarium species in a land habitat (if the library has a `kind`)
- object partly outside the map (should be impossible; a defensive check)
- barrier grade lower than a species' required grade [P2]
- habitat with no staff path touching it [P3]

Checks inform. They never block saving or exporting.

### 4.8 Map settings [MVP]
Biome, mode, map preset, units (metric/imperial), grid size, snapping options, angle step, show areas on map, map style (**Clear** default / **Poster**), patterns on/off (forced on in high-contrast), title block, shortcuts on/off and remapping, requirement buffer %.

---

## 5. Import, export and sharing

| Feature | Phase | Notes |
|---|---|---|
| Save plan file (`.zooplan.json`) | MVP | Schema-versioned, validated on import with Zod, ≤ 10 MB |
| Open plan file | MVP | Drag-drop **and** file picker. Shows a summary before replacing anything ("Open 'Crystal Ridge' — 142 objects?") |
| PNG export | P2 | 1×, 2× or 4× scale. Max 8192 px on the long edge. Whole map, current view or selection. Optional legend/title block |
| SVG export | P2 | Contains `<title>`, `<desc>`, and the legend as real text. User text is escaped |
| Print / PDF poster | P2 | Print stylesheet: title block + map + legend in the reference poster's layout. Letter, Tabloid, A3 and A2 landscape |
| Text summary | P2 | HTML (and CSV/Markdown) listing every area, habitat, size, species and count. This is the accessible equivalent of the poster |
| Share link | P2 | Plan JSON → compressed (lz-string) → URL fragment `#plan=…`. Warn if > 8,000 chars and offer the file instead. Tracing images are never included. Opening a link creates a **copy** in the user's plans |
| Delete all my data | MVP | Settings → clears IndexedDB and localStorage after confirmation |

---

## 6. Keyboard shortcuts (defaults; all remappable; single keys only while the map has focus)

| Key | Action | | Key | Action |
|---|---|---|---|---|
| `V` | Select tool | | `Enter` | Place point / finish shape / enter vertex mode |
| `H` | Habitat tool | | `Esc` | Cancel / exit mode / deselect |
| `B` | Building tool | | `Backspace` | Remove last point while drawing |
| `P` | Path tool | | Arrows | Move crosshair / nudge selection (1 grid step) |
| `F` | Barrier tool | | `Shift`+Arrows | ×10 |
| `W` | Water tool | | `Alt`+Arrows | 0.1 m |
| `G` | Planting tool | | `Ctrl`+Arrows | Pan |
| `I` | Icon tool | | `+` / `−` / `0` | Zoom in / out / fit map |
| `T` | Label tool | | `[` / `]` | Rotate −/+15° |
| `M` | Measure tool | | `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `1`–`4` | Shape mode | | `Ctrl+D` | Duplicate |
| `,` / `.` | Shrink / grow selection 5% | | `Ctrl+[` / `Ctrl+]` | Send backward / bring forward (Shift = to back / front) |
| `Ctrl+I` | Announce cursor or selection position | | `Delete` | Delete selection |
| `F6` | Next region | | `Shift+F10` | Context menu |
| `?` | Shortcuts dialog | | `Alt` (hold) | Disable snapping |

On macOS, `Ctrl` → `⌘` where conventional (undo/redo/duplicate), and `Alt` → `⌥`.
