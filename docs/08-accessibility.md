# 08 · Accessibility

## Target standard
Kyle asked for "the most stringent gov web regulations." As a private fan site, we aren't legally covered by most of these, but we're building to the strictest combination of them:

| Regime | What it requires | Covered by our target? |
|---|---|---|
| **WCAG 2.2 Level AA**, which is also **ISO/IEC 40500:2025** | The baseline. 2.2 adds 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements, 2.5.8 Target Size, 3.2.6 Consistent Help, 3.3.7 Redundant Entry and 3.3.8 Accessible Authentication | **Yes, our minimum** |
| **US Section 508** (Revised 2017 ICT Standards) | WCAG 2.0 AA for web content | Yes (2.2 AA is a superset; 4.1.1 Parsing was dropped in 2.2, but we still ship valid HTML) |
| **ADA Title II rule** (US state/local government, 28 CFR 35.200) | WCAG 2.1 AA. Compliance dates moved by DOJ's April 2026 interim final rule to **26 Apr 2027** (≥ 50k population) and **26 Apr 2028** (smaller) | Yes (subset of 2.2 AA) |
| **California Gov. Code §11546.7** (state agency sites) | WCAG 2.0 or later, Level AA, with a biennial signed certification posted on the home page | Yes. We publish an accessibility statement and ACR in the same spirit |
| **EN 301 549 v4.1.1** (EU; published 2 Sep 2026, adopts WCAG 2.2 AA; expected in the EU Official Journal around 30 Nov 2026 for the European Accessibility Act) | WCAG 2.2 AA plus extra clauses, including reworked **user preferences** requirements | Yes. See "EN 301 549 extras" below |
| **Selected WCAG 2.2 AAA** (no regime requires these; we take them where cheap) | 1.4.6 Contrast (Enhanced) for body text · 2.3.3 Animation from Interactions · 2.4.13 Focus Appearance · 2.1.3 Keyboard (No Exception) · 2.5.5 Target Size (Enhanced, 44 px) for primary controls · 3.3.5 Help | Target, not gate |

**Conformance claim (at launch):** WCAG 2.2 Level AA, full pages, all processes (plan creation → drawing → export). Map content the **user** authors (e.g. their custom Poster-style colours) falls under WCAG's "partial conformance due to third-party content" provision only where the user deliberately overrides our conforming defaults.

## The hard part: an accessible map editor
A visual drawing surface is the riskiest part for conformance. Our strategy has five layers, and **all five ship in the MVP**:

1. **Equivalent structured alternative.** The **Objects panel** (tree grid) lists every object with type, name, area, area membership, animals and requirement status. The **Inspector** edits every property as labelled form fields, including a vertex table. A screen-reader user can create, size, position, inspect and export a full plan without the visual map.
2. **Keyboard drawing on the map itself.** A crosshair cursor moves by grid steps. Enter places points, arrows nudge, Tab cycles objects and vertices, and `Ctrl+I` announces position. Nothing on the map requires a pointer.
3. **No drag required (2.5.7).** Every drag has a non-drag path: click-click for rectangles and ellipses, inspector fields, "Move by…" and "Resize to area…" dialogs, rotate buttons, minimap click to pan, and zoom buttons.
4. **Typed creation.** "Add habitat by size…" places a shape from typed area, aspect and position. This is often faster for everyone.
5. **Clear announcements.** One throttled polite live region reports outcomes (shape created, area, undo). Save failures go to an assertive region. It never announces continuous cursor movement.

**Map semantics:**
- The map viewport is a `role="application"` element with `aria-roledescription="zoo map editor"`, a visible and programmatic label ("Map of Crystal Ridge Zoo"), and `aria-describedby` pointing to short instructions ("Arrow keys move the cursor. Enter places a point. Press question mark for all shortcuts."). `application` is justified because the map implements its own keyboard model. Test it with NVDA, JAWS and VoiceOver. If testing shows problems, fall back to a focusable `group`, with the Objects panel as the primary SR path.
- Each SVG object is focusable in vertex/selection modes (roving tabindex) and has an accessible name built from its data, e.g. "Elephant habitat, habitat, 4,120 square meters, African grasslands, 1 male 5 female elephants".
- Decorative SVG (grid, casing, patterns) is `aria-hidden="true"`.

## Criterion checklist (planner-specific notes)
| SC | How we meet it |
|---|---|
| 1.1.1 Non-text content | Icons have names. Map objects have computed names. Hero SVG has `<title>`/`<desc>`. User-imported images get an optional description, and exported images include alt text in the SVG/HTML summary |
| 1.3.1 Info and relationships | Real tables, lists, fieldsets and headings. The tree grid exposes hierarchy (area → habitat) |
| 1.3.4 Orientation | Works in portrait and landscape |
| 1.3.5 Identify input purpose | Not applicable (no personal data fields). Zoo name is not a personal-data field |
| 1.4.1 Use of colour | Patterns, labels, icons and text status (✓/⚠ with words) |
| 1.4.3 / 1.4.6 Contrast | Tokens in `07-design-system.md` (body ≥ 7:1 target, all text ≥ 4.5:1) |
| 1.4.4 Resize text / 1.4.10 Reflow | Panels reflow at 320 px. The map itself is a two-dimensional exception, but its controls are not |
| 1.4.11 Non-text contrast | Map casing rule, ≥ 3:1 input borders, focus and selection indicators |
| 1.4.12 Text spacing | No fixed-height text containers. Tested with the text-spacing bookmarklet |
| 1.4.13 Content on hover/focus | Tooltips are dismissible (Esc), hoverable and persistent |
| 2.1.1 / 2.1.2 / 2.1.3 | Full keyboard, no traps (Esc always exits a mode), AAA target of no exceptions |
| 2.1.4 Character key shortcuts | Single-key shortcuts are active only with map focus, and can be turned off or remapped in Map settings |
| 2.2.1 / 2.2.2 | No time limits. The hero animation is ≤ 5 s with a Pause button |
| 2.3.1 / 2.3.3 | No flashing. Reduced motion is respected everywhere |
| 2.4.1 Bypass blocks | Skip link, landmarks, F6 region cycling in the planner |
| 2.4.3 Focus order | Follows visual and logical order. Dialogs trap focus correctly and restore it |
| 2.4.7 / 2.4.11 / 2.4.13 | Visible two-colour focus. Auto-pan so focused objects are never hidden behind panels |
| 2.5.1 Pointer gestures | Pinch/two-finger gestures always have button equivalents |
| 2.5.2 Pointer cancellation | Actions fire on pointer **up**. Dragging back out cancels |
| 2.5.3 Label in name | Visible labels are contained in accessible names (tool rail text labels help) |
| 2.5.7 Dragging movements | See layer 3 above |
| 2.5.8 Target size | ≥ 24 × 24 px, handles included (hit area) |
| 3.1.1 Language | `<html lang="en">` |
| 3.2.6 Consistent help | Help link in the same place in the header and footer of every page, and `?` in the planner |
| 3.3.1–3.3.4 | Inline, specific errors ("Width must be between 1 and 1000 m"). Destructive actions (delete plan, clear data) confirm and can be undone where possible |
| 3.3.7 Redundant entry | The zoo name entered at creation pre-fills the title block and export filename. Species details entered once are reused via the species library |
| 3.3.8 Accessible authentication | No login exists |
| 4.1.2 Name, role, value | Native elements first, then React Aria patterns. Custom map objects expose name and state (selected, locked) |
| 4.1.3 Status messages | Live region strategy above. The status bar is not a live region, to avoid noise |

## EN 301 549 extras to honour
- **User preferences (clause 11.7 and related):** follow platform settings for colour scheme, contrast, reduced motion, text size (rem everywhere) and forced colours. Never override user stylesheets with `!important` on colours.
- **Documentation and support services (clause 12):** Help pages and the accessibility statement are themselves accessible HTML, describe the accessibility features (keyboard shortcuts, structured alternative) and give an accessible way to report problems.
- **Non-web documents (clause 10):** exported files carry their own accessibility. The SVG gets title, desc and a text legend, and the **text summary** export is the accessible equivalent of the poster. If we ever generate PDFs directly (not via the browser's print), they must be tagged PDF/UA. Until then, we rely on browser print and say so.

## Writing for accessibility
- Plain language, aiming for grade 7–8 reading level on content pages (Hemingway/Flesch check in CI is optional).
- Links say where they go ("Read the accessibility statement", not "click here").
- Abbreviations get expanded on first use (m² is fine; spell it out in accessible names: "square meters").

## Deliverables before launch (Milestone 8)
1. Automated: axe-core on every page and on 12 planner states (see `12-testing-and-qa.md`) with **0 violations**.
2. Manual: a full WCAG 2.2 A/AA pass using the **DHS Trusted Tester** style process (the US federal Section 508 test method) for each page and the planner's key flows.
3. Assistive technology task scripts passing on the support matrix.
4. **Accessibility Conformance Report** using the latest ITI **VPAT® INT edition** (2.5Rev INT at the time of writing; if ITI has released an edition aligned to EN 301 549 v4.1.1, use that), published as accessible HTML at `/accessibility/report`.
5. The accessibility statement at `/accessibility`, dated.
6. Ideally, a paid review by disabled testers (e.g. a screen-reader user and a switch user) before launch. Budget permitting; noted in open questions.
