# 10 · Legal and intellectual property

> This is a practical risk-reduction plan written by an AI assistant, **not legal advice**. Have a lawyer review the Terms page and this posture before launch, and before any monetisation.

## 1. The relationship with Frontier
- Planet Zoo and Planet Zoo 2 are made and owned by **Frontier Developments plc**. "PLANET ZOO" is a registered US trademark (Reg. No. 5,917,958).
- As of October 2026 we couldn't find a published Frontier **fan-content or fan-site policy**. Frontier's legal page lists its EULA, Terms, Code of Conduct and Legal Notices, but none of them is a fan-site licence. So we rely on general law (nominative fair use) and a strict "no Frontier assets" rule.
- **Recommended:** before launch, email Frontier's community or legal team a short description and link, asking whether they have objections or brand guidelines. File the reply in `docs/`.

## 2. Using the name "Planet Zoo"
Kyle is in California (US Ninth Circuit), where **nominative fair use** (*New Kids on the Block v. News America*, 1992) allows using a trademark to refer to the real product if:
1. the product can't readily be identified without the mark;
2. only as much of the mark is used as necessary (the **words**, never the logo, stylised lettering or colours);
3. nothing suggests sponsorship or endorsement.

So:
- ✅ Body copy like "a planning tool for Planet Zoo 2 players" is fine.
- ❌ The site name, logo, domain, favicon and social handles must **not** contain "Planet Zoo", "PZ" or "PZ2", or resemble Frontier branding. (A domain containing the mark also invites a UDRP complaint.)
- ❌ No Frontier logos, box art, key art, game fonts, UI chrome, colours lifted from the game's UI, music, sounds or videos.
- Before choosing the final name, run a USPTO trademark search on it (and EUIPO/UKIPO if there's an international audience).

### Required disclaimer (footer of every page, plus the top of `/terms`)
> Zoo Plotter is an unofficial, fan-made planning tool. It is not affiliated with, endorsed, sponsored or approved by Frontier Developments plc. Planet Zoo and Planet Zoo 2 are trademarks of Frontier Developments plc. All other trademarks belong to their respective owners.

## 3. Assets: what we may use

| Asset | Allowed source | Not allowed |
|---|---|---|
| UI icons | Our own drawings. **AIGA/DOT symbol signs** (US government work, public domain) as a base for facility pictograms | Icons traced or extracted from the game. Icon packs with unclear licences |
| Animal silhouettes | Our own drawings. **PhyloPic** images licensed **CC0 or CC BY** (with attribution) | PhyloPic images with NC/ND licences. In-game animal art. Silhouettes traced from game screenshots |
| Fonts | Atkinson Hyperlegible Next/Mono (**SIL OFL 1.1**), self-hosted, licence text included | Any font from the game. Fonts without a webfont licence |
| Illustrations on the landing page | SVG drawn with the planner's own renderer | Game screenshots, trailers, press-kit art |
| Example plans | Plans we draw ourselves | Recreations of Frontier's official career maps |

Every icon is recorded in `src/assets/icons/manifest.json`:
```json
{ "id": "zebra", "label": "Zebra", "author": "…", "sourceUrl": "…", "licence": "CC0-1.0", "modified": true }
```
`/credits` is generated from the manifest, and CI fails if an icon file lacks a manifest entry or the licence isn't in the allowlist (`CC0-1.0`, `CC-BY-3.0`, `CC-BY-4.0`, `PDM`, `OWN`).

## 4. Game data (species requirements, barriers, biomes)
- **US:** bare facts (e.g. "this barrier is grade 4") aren't copyrightable (*Feist v. Rural Telephone*, 1991), but a creative selection and arrangement can be.
- **EU/UK:** the **sui generis database right** (Directive 96/9/EC) can protect a database against extraction of a substantial part, even when the facts themselves are free.
- **Game EULA:** typically forbids reverse-engineering and data-mining game files. **We never datamine**, and we never ship data scraped wholesale from community wikis (they have their own rights and terms).

Our approach:
0. **Species names (decided by Kyle, 2026-10-15):** we ship `data/species.json`, a list of all 136 Planet Zoo 2 species with their common and scientific names, enclosure kinds (habitat/aviary/aquarium/exhibit), regions, taxonomic class and edition, read from Frontier's **public Zoopedia web page** (not from game files). These are short factual entries, attributed on `/credits`. Our legend category for each species is our own grouping. No requirement numbers are included.
1. **Launch:** the species **requirements** are **user-entered**. The requirement check works fully without any bundled requirement data.
2. **Small factual lists we do ship** (biome names, barrier names and grades): short, factual, attributed and flagged unverified, used only so the UI can offer choices.
3. **Optional "starter list" (P3):** only after legal review. Compile it independently from normal gameplay observation (reading the in-game Zoopedia as a player), keep it to the fields the planner needs, attribute it, invite corrections, and remove it promptly if Frontier objects.
4. `data/species-requirements.example.json` is a **test fixture** and is never bundled.

## 5. Open-source licences
- Allowed for bundled code: MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, BlueOak-1.0.0, Unlicense. Fonts: OFL-1.1.
- **Not allowed** in the bundle: GPL, LGPL (unless reviewed), AGPL, SSPL, CC-BY-NC, any "non-commercial" or "no-AI" licence, unlicensed code.
- Dev-only tools (test runners, linters) may use other OSI licences because they aren't distributed.
- `npm run licenses` generates `/credits` data and fails CI on violations.
- Our own repo's licence (MIT vs all rights reserved) is open question Q3.

## 6. Site legal pages
- `/terms`: disclaimer, "as is" with no warranty, planning figures are estimates, users own their plans, acceptable use for share links, trademark notice, governing law (California, to confirm with counsel), contact, effective date.
- `/privacy`: see `02-landing-and-site-pages.md` and `09-privacy-and-security.md`. Even with zero collection, publishing a clear notice satisfies CalOPPA-style expectations and builds trust.
- `/accessibility`: statement + ACR (`08-accessibility.md`).
- `/credits`: all licences and attributions.
- **Contact for rights holders:** a dedicated address in `/terms` for IP concerns, with a commitment to respond within 5 business days.

## 7. Money
Launch **non-commercial**: no ads (they'd also break the no-tracking rule), no paid features, no affiliate links. A donation link (e.g. Ko-fi) is lower-risk but still commercial use of a fan project. Ask Frontier and a lawyer first. Anything sold must not use the Planet Zoo mark beyond descriptive compatibility statements.
