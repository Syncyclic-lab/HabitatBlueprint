# 01 · Product brief

## One-liner
A free, private, fully accessible web tool for planning a Planet Zoo 2 zoo on a true-scale flat map, so players know where every habitat, building and path goes, and how big each one is, before they build.

## Who it's for
| Player | What they need |
|---|---|
| **Sandbox builders** (main audience) | Big, detailed layouts with themed areas, like `reference/example-3-full-poster-with-legend.png`. They want to see how much of the map each habitat takes and keep a legend of every species. |
| **Franchise players** | Phased plans because money is limited: what to build first, what comes later, and whether a habitat is big enough for the animals they're trading for. |
| **Content creators / "zoo tour" posters** | Clean exportable maps (PNG/SVG/print) with a legend and title block to share. |
| **Disabled players** | Screen reader, keyboard-only, switch, low-vision and colour-blind players need to plan as fully as anyone else. That's why the strict standard is a design input from day one. |

## The job to be done
"When I'm planning a new zoo, I want to sketch the layout at real scale and see the area of every habitat, so the animals' space requirements fit and the zoo flows before I spend hours building."

## What success looks like (launch)
- A player can open the planner, pick a biome and mode, draw their first habitat, and see its area **in under 60 seconds** with no instructions.
- Every habitat shows its **area (m²)**, its **share of the whole map** and the **running total** of planned area.
- A full zoo plan of roughly 150 objects stays smooth: 60 fps pan/zoom on a mid-range laptop and under 100 ms response on edits.
- Plans survive a browser restart (autosave) and can be saved to a file, reopened and shared.
- Independent audit: **0 WCAG 2.2 A/AA failures**, and keyboard-only plus screen-reader task scripts pass on the support matrix.
- No network requests after page load. Nothing about the user leaves their device.

## Scope

### In scope (launch = Milestones 0–8 in `11-roadmap.md`)
- Landing page and static pages (accessibility statement, privacy, terms and disclaimer, credits, help).
- True-scale flat map per biome. Size comes from `data/maps.json`.
- Drawing tools: habitats (incl. aviary, aquarium, exhibit), sub-zones (water, deep water, climbing), buildings, paths, barriers, water features, planting, icons, labels, measure.
- Live area and perimeter readouts, percentage of map, totals and a stats panel.
- Themed areas with an auto-generated legend and title block, styled after the reference poster.
- Animals per habitat with ♂/♀ counts and silhouettes.
- A species requirement check from requirement values the **user enters** (optionally pre-filled from a starter list later, see `10-legal-and-ip.md`).
- Undo/redo, autosave, multiple plans, JSON import/export, PNG/SVG export, print poster, text summary export, share link.
- Tracing underlay: import your own top-down screenshot and calibrate its scale.

### Out of scope (for now)
- Accounts, cloud sync, collaboration, comments.
- 3D, terrain height, real elevation. The maps are flat by definition.
- Anything that reads or writes Planet Zoo 2 save or blueprint files. That needs reverse-engineering, which the legal posture rules out.
- Cost or economy simulation and guest-flow simulation.
- A full species database scraped from the game (see `10-legal-and-ip.md`).
- Native or mobile apps. The web app must still work on tablets and remain usable on phones.

## Principles
1. **The number is the product.** Area figures must be correct, consistent and explained, including what in-game numbers may differ from and why.
2. **Plan, don't simulate.** We help people think and lay things out. We don't pretend to be the game.
3. **Every action has three ways in:** pointer, keyboard and typed numbers.
4. **Private by construction.** There's no server-side state to leak.
5. **Looks like a zoo map, not a CAD program.** The default style is the bold, flat zoo-wayfinding look from the reference images, made legible enough to pass contrast rules.
