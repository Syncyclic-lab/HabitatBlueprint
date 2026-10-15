# 02 · Landing page and site pages

## Site map
| Route | Purpose | Client JS? |
|---|---|---|
| `/` | Landing page: what the tool is, what it does, link into the planner | Only the hero demo island (and it must work with JS off as a static SVG) |
| `/planner` | The planner app | Yes (React island) |
| `/planner/plans` | List, open, duplicate, delete and import saved plans (can be a panel inside `/planner` instead; decide in M3) | Yes |
| `/help` | Getting started, every tool, keyboard shortcuts, accuracy notes | No |
| `/accessibility` | Accessibility statement + link to the conformance report (ACR) | No |
| `/privacy` | Privacy notice | No |
| `/terms` | Terms of use + non-affiliation disclaimer | No |
| `/credits` | Open-source licences, font licence, icon sources and attributions | No |
| `/404` | Not found, with links home and to the planner | No |
| `/.well-known/security.txt` | RFC 9116 security contact | n/a |

Every page has: a skip link, `<header>` with site name and primary nav (Planner, Help, Accessibility), `<main id="main">`, and a `<footer>` with the disclaimer and links to Privacy, Terms, Accessibility, Credits and Help. The footer and its link order are **identical on every page** (WCAG 3.2.3, 3.2.6 Consistent Help). Each page title is unique and follows the pattern `Page – Zoo Plotter`.

---

## Landing page

### Design intent
The hero shows the product doing its one defining thing: **a habitat gets drawn on a zoo map and its area counts up.** That moment is the memorable element. Everything else on the page stays calm and disciplined (see `07-design-system.md`).

```
┌──────────────────────────────────────────────────────────────┐
│ Zoo Plotter                     Planner   Help   Accessibility│
├──────────────────────────────────────────────────────────────┤
│                                  ┌─────────────────────────┐ │
│  Plan the zoo before you         │ (live mini-map: grass,  │ │
│  place a single path.            │  paths, two habitats;   │ │
│                                  │  a third is traced      │ │
│  Lay out habitats, buildings     │  vertex by vertex)      │ │
│  and paths on a true-scale       │                         │ │
│  flat map and see the area of    │  ┌───────────────────┐  │ │
│  every space as you draw.        │  │ Habitat  1,842 m² │  │ │
│                                  │  │ 0.18% of the map  │  │ │
│  [ Open the planner ]            │  └───────────────────┘  │ │
│  How it works                    └─────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ What you can plan   (asymmetric: one large feature + 4 small) │
├──────────────────────────────────────────────────────────────┤
│ How it works   1 Pick a map → 2 Draw and measure → 3 Export   │
├──────────────────────────────────────────────────────────────┤
│ Built for every player   |   Your plans stay on your device  │
├──────────────────────────────────────────────────────────────┤
│ Questions (native <details> accordion)                        │
├──────────────────────────────────────────────────────────────┤
│ footer + disclaimer                                           │
└──────────────────────────────────────────────────────────────┘
```

- Left-align the text. The hero demo sits on the right at ≥ 960 px and stacks below the copy on narrow screens.
- **Hero demo behaviour:** one sequence, ≤ 5 s, plays once on load. It shows vertices being placed and the readout counting to the final figure. A visible **Pause/Replay** button is required (WCAG 2.2.2). With `prefers-reduced-motion`, show the finished state with no animation. With JS off, the static SVG of the finished state still renders. The readout is real text, and the SVG has a `<title>` and `<desc>`.
- The demo is not interactive. It's a picture of the product, not a second product.

### Draft copy (edit freely; keep sentence case and plain verbs)

**H1:** Plan the zoo before you place a single path.

**Lead:** Lay out habitats, buildings and paths on a true-scale flat map and see the area of every space as you draw. Built for Planet Zoo 2 players in Sandbox and Franchise. It's free, needs no account, and works with a keyboard or screen reader.

**Primary button:** Open the planner
**Secondary link:** How it works

**What you can plan**
- **Habitats that fit their animals.** Draw a habitat and get its area, perimeter and share of the map immediately. Add water, deep water and climbing zones and see each one's area too. Enter what your animals need and the planner tells you whether the space is big enough.
- **Themed areas with a legend.** Group habitats into areas like "African grasslands" or "Reptile house". The legend builds itself as you go, listing every species by area.
- **Paths, barriers and buildings.** Set path widths, get barrier lengths, and block out guest buildings, shops and staff areas.
- **Who lives where.** Drop in animal silhouettes with male and female counts.
- **Maps worth sharing.** Export a poster with your zoo's name, logo and legend, or save a file to keep working later.

**How it works** (a real sequence, so numbering is appropriate)
1. **Pick a map.** Choose the biome and mode. The map is drawn to scale, so 1 meter in the planner is 1 meter in the game.
2. **Draw and measure.** Sketch habitats, paths and buildings with your mouse, keyboard or typed numbers. Areas update as you go.
3. **Export and build.** Print the plan, keep it open on a second screen, or share it.

**Built for every player**
Everything works with a keyboard alone, and every shape can be edited by typing its size and position. The whole map is also available as a structured list for screen readers. We test against WCAG 2.2 AA, the standard behind US federal (Section 508) and European (EN 301 549) accessibility rules. Read our accessibility statement.

**Your plans stay on your device**
There are no accounts, cookies or tracking. Your plans are saved in your browser and in files you download. Share links carry the plan inside the link itself, so it never touches our server.

**Questions**
- *Is this made by Frontier?* No. Zoo Plotter is an unofficial fan-made tool and isn't affiliated with or endorsed by Frontier Developments.
- *How big is the map?* Each flat map is drawn at its true in-game size. Read "About map size" in Help for how we measured it. (Until the size is verified, this answer must say so. See `04-game-data-and-map-scale.md`.)
- *Will the areas match the game exactly?* Closely, but not always. The game can count area differently around barriers, water edges and slopes. Plan with a margin; the planner adds a 10% buffer by default.
- *Can it read my save or blueprint files?* No. It doesn't touch game files.
- *Does it work on a phone or tablet?* Yes. Tablets get the full planner. Phones can view, edit and export, but a bigger screen is easier for drawing.
- *Do I need an account?* No.

---

## Static pages: required content

### `/accessibility`: accessibility statement
Follow the structure of the W3C statement generator:
- Commitment and target standard: WCAG 2.2 Level AA (ISO/IEC 40500:2025), with the EN 301 549 v4.1.1 additions listed in `08-accessibility.md`.
- Conformance status: "Partially conforms" until the audit in M8 passes, then "Fully conforms" with the audit date.
- Known limitations, each with a workaround. The map is a 2D canvas-like visual, and the Objects panel and Inspector are the equivalent alternative.
- Compatibility: the browser + assistive technology matrix from `12-testing-and-qa.md`.
- Technical specs relied on: HTML, CSS, JavaScript, WAI-ARIA, SVG.
- Assessment approach: self-evaluation + automated (axe) + manual (Trusted Tester-style) + screen-reader testing, plus any external audit.
- Feedback: how to report a barrier, with a target response time (e.g. 5 business days).
- Date the statement was written and last reviewed.
- A link to the Accessibility Conformance Report (latest ITI VPAT® INT edition, covering WCAG, Section 508 and EN 301 549) as an accessible HTML page.

### `/privacy`
Plain-language, in this order:
1. What we collect: nothing. No cookies, analytics or accounts.
2. What's stored on your device: plans and settings in your browser's IndexedDB and localStorage, used only so the app works. How to clear them (in-app "Delete all my data" button + browser instructions).
3. Share links: the plan is in the part of the link after `#`, which browsers don't send to servers. Anyone you give the link to can see the plan.
4. Hosting: the host (e.g. Cloudflare) processes IP addresses in server logs to deliver the site and keep it secure. Name the host and link its privacy policy.
5. Children: the site collects no personal information from anyone, including children under 13.
6. Your rights (GDPR/UK GDPR/CCPA): since we hold no personal data, there's nothing to access or delete on our side. Give a contact for questions anyway.
7. Changes and effective date.

### `/terms`
- Unofficial fan tool and non-affiliation disclaimer (exact text in `10-legal-and-ip.md`).
- Provided "as is" with no warranty. Planning figures are estimates.
- You own your plans. We don't receive them.
- Acceptable use (don't use share links to distribute unlawful content).
- Trademarks of others are used only to describe compatibility.
- Governing law, contact and effective date. **Kyle should have a lawyer review this page before launch.**

### `/credits`
- Every runtime dependency with its licence (generated at build time from `npm run licenses`).
- Font: Atkinson Hyperlegible Next/Mono, Braille Institute of America, SIL Open Font License 1.1.
- Every icon and silhouette: name, author, source URL, licence (generated from `src/assets/icons/manifest.json`).

### `/help`
- Getting started (60-second walkthrough with text, and static images that have alt text).
- One section per tool, matching the tool list in `03-planner-tools.md`.
- Keyboard shortcuts table (the same data source as the in-app `?` dialog).
- **About map size and area accuracy**: how the map size was measured, the date, the verification status, and why in-game figures can differ.
