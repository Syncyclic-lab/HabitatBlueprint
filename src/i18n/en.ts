/**
 * Every user-facing string (English). Components read from here; nothing is hard-coded.
 * Long-form page prose lives in src/content/*.md and uses the {{SITE_NAME}} token.
 * Sentence case throughout.
 */
import { SITE_NAME } from '../config/site.ts';

const numberFmt = new Intl.NumberFormat('en-US');

export const en = {
  site: {
    name: SITE_NAME,
    titleSuffix: ` – ${SITE_NAME}`,
    skipLink: 'Skip to main content',
    primaryNavLabel: 'Main',
    footerNavLabel: 'Site information',
    disclaimer: `${SITE_NAME} is an unofficial, fan-made planning tool. It is not affiliated with, endorsed, sponsored or approved by Frontier Developments plc. Planet Zoo and Planet Zoo 2 are trademarks of Frontier Developments plc. All other trademarks belong to their respective owners.`,
    homeLinkLabel: `${SITE_NAME} home`,
    openSource: 'Source code',
  },
  nav: {
    planner: 'Planner',
    help: 'Help',
    accessibility: 'Accessibility',
    privacy: 'Privacy',
    terms: 'Terms',
    credits: 'Credits',
  },
  pages: {
    home: { title: `${SITE_NAME} – plan your Planet Zoo 2 zoo to scale` },
    planner: {
      title: 'Planner',
      description: 'Plan habitats, buildings and paths on a true-scale map.',
      noscriptHeading: 'The planner needs JavaScript',
      noscriptBody:
        'The planner runs entirely in your browser, so it needs JavaScript turned on. Nothing is sent to a server.',
      loading: 'Loading the planner…',
    },
    help: {
      title: 'Help',
      description: 'How to use every tool, keyboard shortcuts and notes on accuracy.',
    },
    accessibility: {
      title: 'Accessibility statement',
      description: 'Our accessibility commitment, conformance status and how to report a problem.',
    },
    accessibilityReport: {
      title: 'Accessibility conformance report',
      description: 'Draft conformance report for WCAG 2.2, Section 508 and EN 301 549.',
    },
    privacy: {
      title: 'Privacy notice',
      description: 'We collect nothing. Here is what stays on your device.',
    },
    terms: { title: 'Terms of use', description: 'Terms of use and non-affiliation disclaimer.' },
    credits: {
      title: 'Credits and licences',
      description: 'Open-source software, fonts, icons and data sources used by this site.',
      softwareHeading: 'Open-source software',
      softwareIntro:
        'These packages ship in the code your browser downloads. Each is used under its licence.',
      buildHeading: 'Build tools',
      buildIntro:
        'These tools build the site. Small parts of them run in your browser to load the planner.',
      fontsHeading: 'Fonts',
      fontsBody:
        'Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono, by the Braille Institute of America, used under the SIL Open Font License 1.1. The fonts are served from this site, never from a third party.',
      iconsHeading: 'Icons and silhouettes',
      iconsIntro: 'Every icon on this site was drawn for it. None comes from the game.',
      dataHeading: 'Data sources',
      tablePackage: 'Package',
      tableVersion: 'Version',
      tableLicence: 'Licence',
      tableIcon: 'Icon',
      tableAuthor: 'Author',
      tableSource: 'Source',
      iconsCaption: 'Icons and silhouettes with their licences',
      softwareCaption: 'Runtime packages with their licences',
      buildCaption: 'Build tools with their licences',
      ownWork: 'Drawn for this project',
    },
    notFound: {
      title: 'Page not found',
      heading: 'We couldn’t find that page',
      body: 'The link may be out of date, or the address may have a typo.',
      home: 'Go to the home page',
      planner: 'Open the planner',
    },
  },
  landing: {
    h1: 'Plan the zoo before you place a single path.',
    lead: 'Lay out habitats, buildings and paths on a true-scale flat map and see the area of every space as you draw. Built for Planet Zoo 2 players in Sandbox and Franchise. It’s free, needs no account, and works with a keyboard or screen reader.',
    primaryCta: 'Open the planner',
    secondaryCta: 'How it works',
    demo: {
      title: 'A habitat being drawn on a zoo map',
      desc: 'A grass-green zoo map with paths and two habitats. A third habitat is traced point by point, and its area counts up to 1,842 square meters, 0.18 percent of the map.',
      habitatLabel: 'Habitat',
      finalArea: 1842,
      finalPct: '0.18% of the map',
      pause: 'Pause animation',
      replay: 'Replay animation',
      play: 'Play animation',
    },
    vignette: {
      title:
        'A 40 by 40 meter habitat with a 10 by 10 meter pond. A 5 by 5 meter deep section sits inside the pond.',
      rows: [
        { label: 'Total', value: '1,600 m²' },
        { label: 'Land', value: '1,500 m²' },
        { label: 'Water', value: '100 m²' },
        { label: 'Deep water', value: '25 m²' },
        { label: 'Perimeter', value: '160.0 m' },
      ],
    },
    features: {
      heading: 'What you can plan',
      items: [
        {
          title: 'Habitats that fit their animals.',
          body: 'Draw a habitat and get its area, perimeter and share of the map immediately. Add water, deep water and climbing zones and see each one’s area too. Enter what your animals need and the planner tells you whether the space is big enough.',
        },
        {
          title: 'Themed areas with a legend.',
          body: 'Group habitats into areas like “African grasslands” or “Reptile house”. The legend builds itself as you go, listing every species by area.',
        },
        {
          title: 'Paths, barriers and buildings.',
          body: 'Set path widths, get barrier lengths, and block out guest buildings, shops and staff areas.',
        },
        {
          title: 'Who lives where.',
          body: 'Pick from all 136 Planet Zoo 2 species and add male and female counts to each habitat.',
        },
        {
          title: 'Maps worth sharing.',
          body: 'Export a poster with your zoo’s name, logo and legend, or save a file to keep working later.',
        },
      ],
    },
    how: {
      heading: 'How it works',
      steps: [
        {
          title: 'Pick a map.',
          body: 'Choose the biome and mode. The map is drawn to scale, so 1 meter in the planner is 1 meter in the game.',
        },
        {
          title: 'Draw and measure.',
          body: 'Sketch habitats, paths and buildings with your mouse, keyboard or typed numbers. Areas update as you go.',
        },
        {
          title: 'Export and build.',
          body: 'Print the plan, keep it open on a second screen, or share it.',
        },
      ],
    },
    everyone: {
      heading: 'Built for every player',
      body: 'Everything works with a keyboard alone, and every shape can be edited by typing its size and position. The whole map is also available as a structured list for screen readers. We test against WCAG 2.2 AA, the standard behind US federal (Section 508) and European (EN 301 549) accessibility rules.',
      link: 'Read our accessibility statement',
    },
    privacy: {
      heading: 'Your plans stay on your device',
      body: 'There are no accounts, cookies or tracking. Your plans are saved in your browser and in files you download. Share links carry the plan inside the link itself, so it never touches our server.',
      link: 'Read the privacy notice',
    },
    faq: {
      heading: 'Questions',
      items: [
        {
          q: 'Is this made by Frontier?',
          a: `No. ${SITE_NAME} is an unofficial fan-made tool and isn’t affiliated with or endorsed by Frontier Developments.`,
        },
        {
          q: 'How big is the map?',
          a: 'Each flat map is drawn at its true in-game size as far as we know it. We use 1,000 × 1,000 meters, the size of Planet Zoo 1 and Planet Coaster 2 maps, but we haven’t yet verified it in Planet Zoo 2. Read “About map size” in Help for details.',
        },
        {
          q: 'Will the areas match the game exactly?',
          a: 'Closely, but not always. The game can count area differently around barriers, water edges and slopes. Plan with a margin; the planner adds a 10% buffer by default.',
        },
        {
          q: 'Can it read my save or blueprint files?',
          a: 'No. It doesn’t touch game files.',
        },
        {
          q: 'Does it work on a phone or tablet?',
          a: 'Yes. Tablets get the full planner. Phones can view, edit and export, but a bigger screen is easier for drawing.',
        },
        { q: 'Do I need an account?', a: 'No.' },
      ],
    },
  },
  shortcuts: {
    toolSelect: 'Select tool',
    toolHabitat: 'Habitat tool',
    toolBuilding: 'Building tool',
    toolPath: 'Path tool',
    toolBarrier: 'Barrier tool',
    toolWater: 'Water tool',
    toolPlanting: 'Planting tool',
    toolIcon: 'Icon tool',
    toolLabel: 'Label tool',
    toolMeasure: 'Measure tool',
    shapePolygon: 'Shape: polygon',
    shapeRect: 'Shape: rectangle',
    shapeEllipse: 'Shape: ellipse',
    shapeFreehand: 'Shape: freehand',
    placePoint: 'Place a point, finish a shape, or edit the selected shape’s points',
    cancel: 'Cancel, leave a mode, or clear the selection',
    removeLastPoint: 'Remove the last point while drawing',
    moveCursor: 'Move the crosshair, or nudge the selection by one grid step',
    moveCursorFar: 'Move or nudge 10 grid steps',
    moveCursorFine: 'Move or nudge 0.1 m',
    pan: 'Pan the map',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomFit: 'Fit the whole map',
    zoomSelection: 'Zoom to the selection',
    rotateLeft: 'Rotate the selection 15° left (Shift: 1°)',
    rotateRight: 'Rotate the selection 15° right (Shift: 1°)',
    shrink: 'Shrink the selection 5% (Shift: 1%)',
    grow: 'Grow the selection 5% (Shift: 1%)',
    undo: 'Undo',
    redo: 'Redo',
    duplicate: 'Duplicate the selection',
    deleteSelection: 'Delete the selection',
    selectAll: 'Select everything',
    nextObject: 'Move between objects on the map (Shift+Tab goes back)',
    sendBackward: 'Send backward',
    bringForward: 'Bring forward',
    sendToBack: 'Send to back',
    bringToFront: 'Bring to front',
    mirrorH: 'Mirror left to right',
    mirrorV: 'Mirror top to bottom',
    lock: 'Lock or unlock the selection',
    hide: 'Hide or show the selection',
    whereAmI: 'Say where the crosshair or selection is',
    contextMenu: 'Open the menu for the selection',
    nextRegion: 'Move to the next part of the planner',
    previousRegion: 'Move to the previous part of the planner',
    shortcutsDialog: 'Show all keyboard shortcuts',
    suspendSnap: 'Hold to turn snapping off for a moment',
  },
  units: {
    m: 'm',
    m2: 'm²',
    ha: 'ha',
    ft: 'ft',
    ft2: 'ft²',
    acres: 'acres',
    meters: 'meters',
    squareMeters: 'square meters',
    hectares: 'hectares',
    feet: 'feet',
    squareFeet: 'square feet',
  },
  format: {
    count: (n: number) => numberFmt.format(n),
  },
} as const;

export type Strings = typeof en;
