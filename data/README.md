# data/

Static data the app imports at build time. **Code never duplicates these values.**

| File | What it holds | Ships in the app? |
|---|---|---|
| `maps.json` | Map presets (width × height in meters). **Map size is not yet verified for PZ2.** | Yes |
| `biomes.json` | The 12 PZ2 biomes, which can be a map ground, and our ground/path colours | Yes |
| `object-types.json` | Every drawable type with its default colour, label ink, pattern, path widths and the themed-area palette | Yes |
| `barriers.json` | Barrier names and grades (community-reported, unverified) | Yes, shown with an "unverified" note |
| `species.json` | All 136 PZ2 species: names, scientific names, enclosure kinds, regions, class, edition (official Zoopedia). **No requirement numbers** | Yes |
| `species-requirements.example.json` | Shape of a species entry, plus test cases for the requirement formula | **No.** Tests only |

## Rules
1. Every game fact has a `source` and a `verified` flag. No exceptions.
2. Colours here are our own design choices, sampled from Kyle's reference maps and contrast-checked (see `docs/07-design-system.md`). They aren't game assets.
3. Change a value → bump `lastReviewed` → run the tests. Geometry tests read `maps.json`, so a size change is covered.
4. Validate these files with Zod schemas at build time (`src/data/schemas.ts`). A malformed data file must fail the build.
5. Never add data extracted from game files (see `docs/10-legal-and-ip.md`).
