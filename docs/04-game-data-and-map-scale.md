# 04 · Game data and map scale

Planet Zoo 2 (Frontier Developments) came out on **13 October 2026** for Windows, PS5 and Xbox Series X|S. When this kit was written (15 October 2026), most hard numbers about the game were not yet documented by Frontier. This file records what we know, where it came from, and how sure we are. **The `data/` folder is the single source of truth in code.** This file explains it.

Status legend: ✅ confirmed by an official source · 🟡 community-reported or carried over from Planet Zoo 1, needs in-game check · ❓ unknown

---

## 1. Map size

| Fact | Status | Evidence |
|---|---|---|
| PZ2 flat map size | ❓ → default **1000 m × 1000 m** until verified | No official figure found for PZ2. |
| Planet Zoo 1 sandbox/franchise maps ≈ 1000 × 1000 m (1 km²) | 🟡 | Player-measured (Steam discussions). A PZ1 heightmap guide gives **1000 × 990 m** for a 1024 × 1024 px heightmap. A PZ1 border-expansion mod caps borders at "1000". |
| Planet Coaster 2 (same studio, same engine generation) max map 1 km × 1 km | 🟡 | Frontier forum thread on PC2 map size. |

**Decision:** ship with `widthM: 1000, heightM: 1000, verified: false` in `data/maps.json`. The UI must:
- read the size only from `maps.json` (never hard-code it)
- show "Map size not yet verified for Planet Zoo 2" in Map settings and in Help until `verified` is `true`
- recompute everything correctly if the size changes. Existing plans store their own map size, so they don't silently change. Opening an old plan when the preset changes offers "Update to the new map size" (objects keep their coordinates).

### 1.1 How Kyle (or any player) can verify the size in-game (≈ 10 minutes)
Do this in Sandbox, Creative preset, on a flat map:
1. **Barrier method (preferred).** With the habitat barrier tool, draw a rectangle that hugs the four corners of the buildable boundary as closely as the tool allows. Open the new habitat's info panel and read its **total area**. For a square map, side ≈ √area. Write down the exact unit label shown (PZ1 sometimes showed large areas in an unusual "k m²" format; we need the label exactly as displayed).
2. **Edge-length check.** If the barrier or path tool shows segment length while drawing, draw one straight segment along a full edge and note the length. Do this for both a north–south and an east–west edge, because PZ1's heightmap suggested a slightly non-square 1000 × 990 m.
3. **Repeat on a second biome** to confirm all flat maps share one size.
4. **Repeat in Franchise** if you have it, to confirm Franchise plots match Sandbox.
5. Record the results in `data/maps.json`: set the numbers, `"verified": true`, `"verifiedOn": "YYYY-MM-DD"`, `"verifiedBy"`, `"method"`, and update the Help page.

If the buildable area is smaller than the visible map (a boundary with scenery beyond it), the planner maps the **buildable** area only.

---

## 2. Game modes

| Mode | Status | Notes for the planner |
|---|---|---|
| Career | ✅ exists | Out of scope: prebuilt scenario maps aren't flat. |
| Franchise | ✅ exists (online, trading animals with other players) | In scope. Map size per `maps.json` (assumed equal to Sandbox until verified). |
| Sandbox | ✅ exists; empty field start; Creative (unlimited money) and Challenge presets; size limited by a complexity meter | In scope. The main audience. |
| Wildlife Reserves | ✅ new in PZ2 | Out of scope for launch. Separate, non-zoo spaces where habitat barriers can't be built (community-reported). Possible P3 "Reserve" map type. |

The planner stores `mode` as plan metadata. It doesn't change geometry. It changes defaults (e.g. Franchise shows build phases by default) and the legend title block.

## 3. Biomes

PZ2 lists **12 biomes** (community wikis, consistent across two independent sites, 🟡). Six are land biomes, which are the candidates for a map's ground. The rest are water/wetland biomes that matter for aquariums and wetland habitats.

| Biome | Type | Planner use |
|---|---|---|
| Grassland (a.k.a. Savannah on one site) | Land | Map ground ✓ (default) |
| Tropical (a.k.a. Rainforest) | Land | Map ground ✓ |
| Temperate | Land | Map ground ✓ |
| Desert | Land | Map ground ✓ |
| Taiga | Land | Map ground ✓ |
| Tundra | Land | Map ground ✓ |
| Wetlands | Water & wetland | Map ground ❓ (offered, flagged unverified) and habitat tag |
| Lakes and Rivers | Water & wetland | Aquarium/habitat tag |
| Reef | Water & wetland | Aquarium tag |
| Estuarine | Water & wetland | Aquarium tag |
| Open Sea | Water & wetland | Aquarium tag |
| Mangrove | Water & wetland | Aquarium/habitat tag |

Region list from the in-game "Planet Hub" (🟡): 7 land regions (Africa, Asia, Europe, North America, South America, Oceania, Arctic) and 5 oceans (Pacific, Indian, Atlantic, Arctic, Southern). Use these as **suggested names** for themed areas and as species-library tags. They don't change the map.

We don't know exactly how PZ2's map picker combines region and biome. The planner treats **biome** as the only map-defining choice and offers region as optional metadata.

## 3a. Species list ✅

`data/species.json` lists **136 species** (checked 15 October 2026) from the official Zoopedia at planetzoogame.com/2/zoopedia: 130 announced before launch plus 6 revealed on launch day (Asian Small-Clawed Otter, Binturong, Black Rhinoceros, Javanese Cownose Ray, Koi, Sand Tiger Shark). Six are Deluxe Edition only (Axolotl, Blue and Gold Fusilier, Golden Eagle, Golden Lion Tamarin, Great Hammerhead, Longfin Batfish).

By enclosure: 57 habitat animals, 12 aviary birds, 37 aquarium species and 46 exhibit species (16 species can live in either an aquarium or an exhibit). The Zoopedia's continent names are used for regions ("Australasia", not "Oceania").

Each entry also has a **legend category** (Herbivores, Predators, Primates, Birds, Reptiles, Amphibians, Fish, Invertebrates, Other). That grouping is ours, not the game's, and users can change it per species. When Frontier adds animals (DLC or free updates), add them here with the same fields and bump `lastReviewed`.

## 4. Habitat requirements (what the game measures)

Community data (🟡), apparently exported from the in-game Zoopedia, lists requirements per species as minimum area in m² for each space type, plus an increment per additional animal:
- **Land**, **Water**, **Deep water**, **Climbing**, **Flying** (aviary birds)
- Temperature range (°C), group size (min–max), and **barrier grade** (1–4 needed by species; barriers range 1–6)

Example shapes of data (not to be shipped as-is; see `10-legal-and-ip.md` §4): "Land 160 m² (+80)", "Land 705 m² (+110), Water 40 m² (+10), Climbing 30 m² (+10)".

**Unknowns that affect our maths (flag in UI, list in Help):**
- ❓ Does the base figure cover one animal or the minimum group size? Our formula exposes `includedInBase` (default 1) so users can set it.
- ❓ Does deep water also count toward water? We assume **yes** (water reported = union of water and deep water). Verify in-game by building a habitat with only deep water and checking whether water area is non-zero.
- ❓ Does land area exclude the footprint of shelters and climbing frames? We assume **no**.
- ❓ How does the game measure area on terrain slopes? Flat maps make this mostly moot. If a user sculpts terrain in-game, real area exceeds plan area.

## 5. Barriers (🟡, community list)

16 barrier types with grades 1–6. Names and grades are in `data/barriers.json`. Height, climbability and watertightness per type are **not** confirmed, so the planner shows only name and grade until verified.

## 6. Paths (🟡, single community source)

A community tutorial lists guest paths at 2–10 m wide, staff paths at 2–6 m, queues at 2–4 m and elevated paths at 2–8 m. The source looks unofficial and possibly auto-generated, so the planner allows **1–20 m** for all types and shows these as suggested ranges only. Rotation in-game reportedly snaps in 15° steps (same source), which matches our default angle snap.

## 7. Accuracy statement (use in Help, verbatim or close)

> The planner measures flat, top-down area in square meters. Planet Zoo 2 can count area differently around barrier thickness, water edges, shelters and sloped terrain, so in-game figures may come out a little higher or lower than the plan. The requirement check adds a 10% safety margin by default, and you can change it in Map settings.

## 8. Keeping data current
- Each JSON file in `data/` has `"lastReviewed"` and per-entry `"verified"` and `"source"`.
- When Frontier publishes official figures, or a player verifies one, update the entry and the date, flip `verified`, and record the method.
- After a game patch, re-check anything marked verified that the patch notes mention.
