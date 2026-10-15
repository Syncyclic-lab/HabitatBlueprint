# HabitatBlueprint

A free, private, accessible planning tool for **Planet Zoo 2** players. Lay out habitats, buildings and paths on a true-scale flat map and see the area of every space as you draw.

**Live site:** https://syncyclic-lab.github.io/HabitatBlueprint/

HabitatBlueprint is an unofficial, fan-made planning tool. It is not affiliated with, endorsed, sponsored or approved by Frontier Developments plc. Planet Zoo and Planet Zoo 2 are trademarks of Frontier Developments plc.

## What's in this repository
| Path | What it is |
|---|---|
| `CLAUDE.md` | Rules for working on the project: stack, non-negotiables, conventions |
| `docs/` | Product spec, planner tools, data model, design system, accessibility, privacy, legal, roadmap, testing |
| `data/` | Game facts and map styling (map size, biomes, species, barriers, object types), each with a source and a verified flag |
| `src/` | The site (Astro) and the planner (React, mounted on `/planner`) |
| `tests/` | Unit tests (Vitest) and end-to-end + accessibility tests (Playwright + axe) |
| `scripts/` | Licence check, post-build security checks, local preview server |

## Running it locally
You need **Node.js 24 LTS**. Keep the folder out of OneDrive (it locks `node_modules`).

```bash
npm ci
npm run dev        # development server at http://localhost:4321/HabitatBlueprint/
npm run build      # production build into dist/
npm run preview    # serve dist/ with the production security headers
```

Checks (all run in CI on every push):

```bash
npm run check      # astro check, TypeScript, ESLint, Prettier
npm run test       # unit tests
npm run test:e2e   # browser tests, including axe accessibility scans
npm run licenses   # fails on any dependency licence outside the allowlist
```

## Privacy
The site collects nothing: no accounts, cookies, analytics or third-party requests. Plans are stored in your browser and in files you download. See the [privacy notice](https://syncyclic-lab.github.io/HabitatBlueprint/privacy/).

## Licence
Code: [MIT](LICENSE). Fonts: SIL Open Font License 1.1. Icons were drawn for this project.
