# 13 · Open questions for Kyle

Claude Code: when one of these blocks you, ask Kyle. Don't guess. Record the answer here with a date and update the doc it affects.

## Still open

| # | Question | Current default | Blocks |
|---|---|---|---|
| Q1b | **Verify the map size in-game** (docs/04 §1.1). Kyle confirmed 1000 × 1000 m as the working size, but it hasn't been measured in Planet Zoo 2 yet, so `maps.json` keeps `verified: false` and the UI shows the "not yet verified" notice. | 1000 × 1000 m, unverified | M8 |
| Q5 | **Contact address** for accessibility feedback, security.txt and rights-holder notices. A dedicated address, not a personal one. | GitHub issues for feedback; GitHub private security advisories for security reports (needs "Private vulnerability reporting" switched on in the repo settings) | M8 (live) |
| Q2b | **Custom domain.** Needed for HSTS preload and a root-level security.txt. | `syncyclic-lab.github.io/HabitatBlueprint` | M8 |

## Answered

| # | Question | Answer | Date | Docs updated |
|---|---|---|---|---|
| Q1 | Exact flat map size | 1000 × 1000 m (working figure; still to be measured in-game, see Q1b) | 2026-10-15 | — |
| Q2 | Site name | **HabitatBlueprint** (one constant in `src/config/site.ts`) | 2026-10-15 | CLAUDE.md |
| Q3 | Code licence | Open source, **MIT** | 2026-10-15 | `LICENSE` |
| Q4 | Money | Free, no donations | 2026-10-15 | — |
| Q6 | Magenta blocks with a person icon | Guest building (magenta); staff = slate grey | 2026-10-15 | — |
| Q7 | Requirement formula | Base covers 1 animal; deep water counts as water. Both user-adjustable | 2026-10-15 | — |
| Q8 | Usage numbers | None | 2026-10-15 | — |
| Q9 | Hosting | **GitHub Pages** for now (repo `Syncyclic-lab/HabitatBlueprint`); Cloudflare later | 2026-10-15 | 06, 09, CLAUDE.md |
| Q10 | Where the code lives | GitHub repo `Syncyclic-lab/HabitatBlueprint`, working copy `C:\dev\HabitatBlueprint` (outside OneDrive). Kyle approved installing Node 24 LTS | 2026-10-15 | CLAUDE.md |
| Q11 | Paid accessibility review | Self-testing only | 2026-10-15 | — |
| Q12 | Units | Metric, with an imperial display toggle | 2026-10-15 | — |
| Q13 | Animal list | Ship **all 136 PZ2 species** (name, scientific name, enclosure kinds, legend category, regions, edition) from the official Zoopedia. Space-requirement numbers stay **user-entered** until the legal review | 2026-10-15 | 04, 05, 10, CLAUDE.md |
| Q14 | Publishing | Push to `main` per milestone and deploy with GitHub Pages | 2026-10-15 | 06 |
