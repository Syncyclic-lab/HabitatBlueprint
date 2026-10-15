# reference/

Kyle's example maps. They show the **look and output** we're aiming for. They're inspiration for our own original rendering, so don't copy them pixel-for-pixel, and don't ship them in the site.

## What each image shows
**`example-3-full-poster-with-legend.png`: the target export.**
- The full zoo on a grass-green ground, with a dark perimeter road along the top and right edges and an entrance at the bottom centre.
- A grand entrance avenue with a roundabout and central fountain (cyan circle).
- Habitats coloured by **themed area**: gold (African grasslands), dark green (Asia house / Asia forests), cyan (aquarium building), purple (South America house), light green (Europe plains), olive (swamp house), red (reptile house).
- **Legend panel** below the map: one coloured block per area, species grouped into categories (Herbivores, Predators, Birds of prey, Primates, Bears, Sharks, Rays, Reptiles…) with a silhouette and name for each, plus a **Guest services** block (restrooms, information, ticket booths, drinks, gift shops, restaurants, staff buildings, water treatment).
- A **title block** with the zoo's logo and name ("Crystal Ridge Zoo").

**`example-2-detail-africa.png`: habitat detail.**
- Soft rounded habitat outlines (pale yellow edge), which is why `cornerRadiusM` exists.
- Animal silhouettes with **sex and count badges** (♂ blue / ♀ pink, e.g. "♀ 5–6").
- Labelled sub-spaces ("Breeding/Extra Pen").
- Magenta blocks with a person icon (guest/viewing buildings or staff areas; see open question Q6) and orange blocks (facilities).
- Light grey paths with rounded junctions, and a wide light plaza area.

**`example-1-detail-habitats.png`: mid-zoom working view.**
- A selected habitat with a **dashed outline and double-headed resize arrows**, which is the selection affordance users expect.
- Indoor complexes: magenta corridors linking many small exhibits.
- Brown lines through habitats (likely a transport ride or elevated path).

## Sampled colours
These became the defaults in `data/object-types.json`.

| Element | Sampled | Notes |
|---|---|---|
| Grass ground | `#5BAB4E` | Grassland biome ground |
| Habitat gold | `#DBB34D` | Default habitat fill / Savanna swatch |
| Forest green habitat | `#20602A` | Needs **white** silhouettes (black is only 2.77:1) |
| Guest/animal building magenta | `#EF37AF` | Black text 5.84:1 |
| Facility orange | `#EF7837` | |
| Path | `#E8ECED` | Light paths need the dark casing on grass (2.39:1 alone) |
| Plaza / secondary paving | `#CFCFBE` | |
| Aquarium cyan | `#37ECEF` | |
| Perimeter road | `#5F5252` | |
| Olive (swamp) | `#99B247` | |
| Purple (South America) | `#B879D6` | |
| Light green (Europe) | `#52C42B` | |

Most fills are under 3:1 against the grass, which is why the design system adds the two-tone **casing** to every shape (`07-design-system.md`).
