/**
 * Long-form page prose (English). Imported only by Astro pages at build time, so none of this
 * ships in the planner's JavaScript. UI strings live in en.ts.
 */
import { CONTACT, DATES, REPO_URL, SITE_NAME } from '../config/site.ts';
import type { Block } from './content-types.ts';

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

// ───────── Privacy ─────────
export const privacy: { lead: string; updated: string; blocks: Block[] } = {
  lead: 'We collect nothing. Your plans stay on your device.',
  updated: `Effective ${longDate(DATES.privacy)}.`,
  blocks: [
    { h2: 'What we collect', id: 'collect' },
    {
      p: `Nothing. ${SITE_NAME} has no accounts, no analytics, no advertising, no tracking pixels and no cookies. We don’t load anything from other companies’ servers: the fonts, scripts and styles all come from this site.`,
    },
    { h2: 'What’s stored on your device', id: 'device' },
    {
      p: 'So the planner can work, your browser keeps a few things on your own device. They never leave it unless you choose to export or share them.',
    },
    {
      ul: [
        'Your plans, autosaved in your browser’s IndexedDB storage.',
        'Images you import to trace over, and logos you add to a title block, also in IndexedDB.',
        'Your planner preferences, such as shortcut settings and panel choices, in IndexedDB and localStorage.',
      ],
    },
    {
      p: [
        'To clear everything, open the planner, choose ',
        { strong: 'Map settings' },
        ', then ',
        { strong: 'Delete all my data' },
        '. You can also clear this site’s data from your browser’s settings (look for “site data” or “cookies and site data”).',
      ],
    },
    { h2: 'Share links', id: 'share-links' },
    {
      p: 'A share link carries your plan inside the part of the link after the # sign. Browsers don’t send that part to any server, so we never receive it. Anyone you give the link to can see the plan. Imported tracing images are never put in share links.',
    },
    { h2: 'Hosting', id: 'hosting' },
    {
      p: [
        'The site is hosted on GitHub Pages. Like any web host, GitHub processes visitors’ IP addresses in its server logs to deliver the site and keep it secure. We don’t receive those logs. Read the ',
        {
          text: 'GitHub Privacy Statement',
          href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
        },
        ' for details.',
      ],
    },
    { h2: 'Children', id: 'children' },
    {
      p: 'We collect no personal information from anyone, including children under 13.',
    },
    { h2: 'Your rights', id: 'rights' },
    {
      p: 'Laws such as the GDPR, the UK GDPR and the California Consumer Privacy Act give you rights over personal data that organisations hold about you. We hold none, so there is nothing for us to access, correct, delete or sell. Global Privacy Control signals are honoured by default, because we don’t sell or share any data.',
    },
    {
      p: [
        'Questions are still welcome: ',
        { text: 'contact us on GitHub', href: CONTACT.feedbackUrl },
        '.',
      ],
    },
    { h2: 'Changes to this notice', id: 'changes' },
    {
      p: 'If we ever change what the site does with data, we’ll update this page and its effective date before the change takes effect.',
    },
  ],
};

// ───────── Terms ─────────
export const terms: { lead: string; updated: string; draftNote: string; blocks: Block[] } = {
  lead: `The rules for using ${SITE_NAME}. They’re short.`,
  updated: `Effective ${longDate(DATES.terms)}.`,
  draftNote: 'Draft for legal review. These terms have not yet been reviewed by a lawyer.',
  blocks: [
    { h2: 'An unofficial fan tool', id: 'unofficial' },
    {
      p: `${SITE_NAME} is an unofficial, fan-made planning tool. It is not affiliated with, endorsed, sponsored or approved by Frontier Developments plc. Planet Zoo and Planet Zoo 2 are trademarks of Frontier Developments plc. All other trademarks belong to their respective owners. We use the game’s name only to say what the tool is for.`,
    },
    { h2: 'Provided as is', id: 'as-is' },
    {
      p: 'The site is free and provided “as is”, without warranty of any kind. Area figures, sizes and other planning numbers are estimates. The game can measure things differently, so always check important numbers in the game before you build.',
    },
    { h2: 'Your plans are yours', id: 'your-plans' },
    {
      p: 'You own the plans you make. They stay on your device and in files and links you create. We don’t receive them.',
    },
    { h2: 'Acceptable use', id: 'acceptable-use' },
    {
      p: 'Share links carry whatever text you put in a plan. Don’t use them to spread unlawful, hateful or harassing content, or anything you don’t have the right to share.',
    },
    { h2: 'Trademarks and game content', id: 'trademarks' },
    {
      p: 'The site contains no game art, logos, fonts, screenshots or files. Icons and silhouettes were drawn for this project. Species names come from the public Planet Zoo 2 Zoopedia and are used only to describe what a player can plan.',
    },
    {
      p: [
        'If you hold rights in something on this site and have a concern, ',
        { text: 'contact us on GitHub', href: CONTACT.feedbackUrl },
        '. We aim to reply within 5 business days.',
      ],
    },
    { h2: 'Source code', id: 'source' },
    {
      p: [
        'The source code is published under the MIT licence at ',
        { text: 'github.com/Syncyclic-lab/HabitatBlueprint', href: REPO_URL },
        '.',
      ],
    },
    { h2: 'Governing law and contact', id: 'law' },
    {
      p: 'These terms are governed by the laws of the State of California, USA (to be confirmed by legal review).',
    },
    {
      p: [
        'Questions about these terms: ',
        { text: 'contact us on GitHub', href: CONTACT.feedbackUrl },
        '.',
      ],
    },
  ],
};

// ───────── Help ─────────
export const help = {
  lead: 'How to plan a zoo with the planner, every tool and keyboard shortcut, and how accurate the numbers are.',
  tocHeading: 'On this page',
  shortcutsCaption: 'Keyboard shortcuts',
  shortcutsKey: 'Key',
  shortcutsAction: 'What it does',
  shortcutsWhere: 'Works',
  scopeMap: 'While the map has focus',
  scopeAnywhere: 'Anywhere in the planner',
  mapSize: {
    caption: 'Map size used by the planner',
    size: 'Size',
    area: 'Area',
    status: 'Status',
    lastReviewed: 'Last reviewed',
    unverified: 'Not yet verified in Planet Zoo 2',
    verified: (on: string, method: string) => `Verified in-game on ${on} (${method})`,
    unverifiedNotice:
      'Map size not yet verified for Planet Zoo 2. We use the size of Planet Zoo 1 and Planet Coaster 2 maps until someone measures it in the game. Your plans keep their own size, so a later correction won’t change them silently.',
  },
  sections: [
    {
      id: 'getting-started',
      title: 'Getting started',
      blocks: [
        {
          ol: [
            [
              { text: 'Open the planner', href: '/planner' },
              ' and choose ',
              { strong: 'New plan' },
              '. Give your zoo a name, pick Sandbox or Franchise and choose a biome.',
            ],
            [
              'Press ',
              { kbd: 'H' },
              ' (or choose ',
              { strong: 'Habitat' },
              ' in the tool rail) and click the map to place the corners of a habitat. Click the first point, double-click, or press ',
              { kbd: 'Enter' },
              ' to finish.',
            ],
            'The Inspector on the right shows the habitat’s area, perimeter and share of the map straight away.',
            [
              'Prefer typing? Choose ',
              { strong: 'Add habitat by size' },
              ', enter the area you want, and the planner places it for you.',
            ],
          ],
        },
        {
          p: 'Your plan saves itself in this browser as you work. To keep a copy elsewhere, use Save to file.',
        },
      ] satisfies Block[],
    },
    {
      id: 'keyboard',
      title: 'Using the planner with a keyboard or screen reader',
      blocks: [
        {
          p: [
            'Press ',
            { kbd: 'F6' },
            ' to move between the top bar, the tool rail, the map, the side panel and the status bar.',
          ],
        },
        {
          p: [
            'When the map has focus and a drawing tool is on, a crosshair appears in the middle of the view. Move it with the arrow keys (one grid step; hold ',
            { kbd: 'Shift' },
            ' for ten, ',
            { kbd: 'Alt' },
            ' for 0.1 m) and press ',
            { kbd: 'Enter' },
            ' to place a point.',
          ],
        },
        {
          p: 'The Objects panel lists everything on the map with its type, size, animals and status, so you can find, select and edit objects without the map. The Inspector edits every property as a form, including a table of each shape’s points.',
        },
        {
          p: 'Single-key shortcuts only work while the map has focus. You can turn them off, or change them, in Map settings.',
        },
      ] satisfies Block[],
    },
    {
      id: 'tools',
      title: 'The tools',
      blocks: [
        { h3: 'Select (V)' },
        {
          p: 'Click an object to select it; Shift+click adds to the selection. Drag on empty ground to select an area. Move, rotate and resize with the handles, the keyboard or the Inspector.',
        },
        { h3: 'Habitat (H)' },
        {
          p: 'Draws an animal space as a polygon, rectangle or ellipse. Choose Habitat, Aviary, Aquarium or Exhibit. With a habitat selected, Add zone draws water, deep water, climbing or other zones, which are kept inside the habitat.',
        },
        { h3: 'Building (B)' },
        {
          p: 'Blocks out animal houses, guest buildings, shops, restaurants, restrooms, staff and vet buildings and more. Each type has its own colour and icon.',
        },
        { h3: 'Path (P)' },
        {
          p: 'Click to place points along a path; press Enter or double-click to finish. Set the type and width (1 to 20 m). The planner reports the length and paved area. Switch to Area mode for plazas.',
        },
        { h3: 'Barrier (F)' },
        {
          p: 'Draws free-standing barriers, such as a wall around a guest area. Barriers on habitat edges are set in the Inspector.',
        },
        { h3: 'Water (W) and Planting (G)' },
        { p: 'Draw ponds, lakes and fountains outside habitats, and planting beds.' },
        { h3: 'Icon (I) and Label (T)' },
        {
          p: 'Place facility icons such as restrooms, food and information, and free text labels.',
        },
        { h3: 'Measure (M)' },
        {
          p: 'Click points to measure a distance, or switch to Area to measure a shape. Press Enter to keep the measurement on the map or Esc to discard it.',
        },
      ] satisfies Block[],
    },
    {
      id: 'animals',
      title: 'Animals and space requirements',
      blocks: [
        {
          p: 'Add animals to a habitat in the Inspector. Pick any of the 136 Planet Zoo 2 species and enter how many males, females and juveniles live there.',
        },
        {
          p: 'To check whether a habitat is big enough, enter the species’ space needs from the in-game Zoopedia in your species library: the base area for land, water, deep water, climbing or flying, and how much each extra animal adds. The planner then works out:',
        },
        {
          p: {
            strong: 'required area = (base + extra animals × area per extra animal) × (1 + buffer)',
          },
        },
        {
          p: 'The buffer is 10% by default and can be changed in Map settings. We don’t yet know for certain whether the game’s base figure covers one animal or a whole group, so you can set how many animals the base figure covers for each species.',
        },
      ] satisfies Block[],
    },
    {
      id: 'map-size',
      title: 'About map size and area accuracy',
      blocks: [
        {
          p: 'The planner measures flat, top-down area in square meters. Planet Zoo 2 can count area differently around barrier thickness, water edges, shelters and sloped terrain, so in-game figures may come out a little higher or lower than the plan. The requirement check adds a 10% safety margin by default, and you can change it in Map settings.',
        },
        {
          p: 'Overlapping shapes are never counted twice in totals: the planned area is the area of all ground-covering shapes merged together. Curved shapes such as circles are measured to within a fraction of a percent.',
        },
        {
          p: 'Water zones count toward water area, and deep water counts toward both water and deep water. Land is the habitat’s total minus its water. These are our planning rules; whether they match exactly how the game counts hasn’t been confirmed yet.',
        },
        { h3: 'How to check the map size yourself' },
        {
          ol: [
            'In Sandbox with the Creative preset, on a flat map, draw a habitat barrier that hugs all four corners of the buildable area.',
            'Open the habitat’s information panel and note the total area exactly as shown, including its unit.',
            'If the path or barrier tool shows lengths, draw along one full north–south edge and one east–west edge and note both.',
            [
              'Tell us what you found on ',
              { text: 'GitHub', href: CONTACT.feedbackUrl },
              ' and we’ll update the map size.',
            ],
          ],
        },
      ] satisfies Block[],
    },
    {
      id: 'shortcuts',
      title: 'Keyboard shortcuts',
      blocks: [
        {
          p: 'On a Mac, use ⌘ instead of Ctrl and ⌥ instead of Alt. You can also open this list in the planner by pressing ? while the map has focus.',
        },
      ] satisfies Block[],
    },
    {
      id: 'saving',
      title: 'Saving, opening and sharing',
      blocks: [
        {
          ul: [
            'Plans save automatically in this browser. Open, rename, duplicate or delete them from the Plans list.',
            'Save to file downloads a .zooplan.json file you can open again on any device.',
            'Share link puts the whole plan inside a link. Opening it makes a copy in the other person’s browser. Long plans may be too big for a link; save a file instead.',
            'Export makes a PNG or SVG picture, a printable poster, or a text summary of every area, habitat and species.',
          ],
        },
      ] satisfies Block[],
    },
    {
      id: 'report-a-security-issue',
      title: 'Report a security issue',
      blocks: [
        {
          p: [
            'If you find a security problem, please report it privately through ',
            { text: 'GitHub’s security advisory form', href: CONTACT.securityUrl },
            ' rather than in a public issue. We aim to reply within 5 business days.',
          ],
        },
      ] satisfies Block[],
    },
  ],
} as const;

// ───────── Accessibility conformance report (draft ACR, VPAT® INT structure) ─────────
type Level = 'Supports' | 'Partially supports' | 'Does not support' | 'Not applicable';
interface AcrRow {
  sc: string;
  name: string;
  level: Level;
  remarks: string;
}

const A: AcrRow[] = [
  {
    sc: '1.1.1',
    name: 'Non-text Content',
    level: 'Supports',
    remarks:
      'Icons are decorative and hidden, with text labels beside them. Map objects get names built from their data. The hero illustration has a title and description.',
  },
  {
    sc: '1.2.1',
    name: 'Audio-only and Video-only (Prerecorded)',
    level: 'Not applicable',
    remarks: 'No audio or video.',
  },
  { sc: '1.2.2', name: 'Captions (Prerecorded)', level: 'Not applicable', remarks: 'No video.' },
  {
    sc: '1.2.3',
    name: 'Audio Description or Media Alternative (Prerecorded)',
    level: 'Not applicable',
    remarks: 'No video.',
  },
  {
    sc: '1.3.1',
    name: 'Info and Relationships',
    level: 'Supports',
    remarks:
      'Headings, lists, tables with headers, fieldsets and landmarks. The Objects panel is a table grouped by themed area.',
  },
  {
    sc: '1.3.2',
    name: 'Meaningful Sequence',
    level: 'Supports',
    remarks: 'Reading order follows the visual order.',
  },
  {
    sc: '1.3.3',
    name: 'Sensory Characteristics',
    level: 'Supports',
    remarks: 'Instructions name controls by their labels, not shape or position.',
  },
  {
    sc: '1.4.1',
    name: 'Use of Color',
    level: 'Supports',
    remarks: 'Zone types have patterns and labels; requirement status uses icons and words.',
  },
  { sc: '1.4.2', name: 'Audio Control', level: 'Not applicable', remarks: 'No audio.' },
  {
    sc: '2.1.1',
    name: 'Keyboard',
    level: 'Supports',
    remarks: 'Every planner action works from the keyboard, including drawing with the crosshair.',
  },
  {
    sc: '2.1.2',
    name: 'No Keyboard Trap',
    level: 'Supports',
    remarks: 'Esc leaves every mode; Tab and F6 always move on.',
  },
  {
    sc: '2.1.4',
    name: 'Character Key Shortcuts',
    level: 'Supports',
    remarks:
      'Single-key shortcuts only work while the map has focus and can be turned off or remapped.',
  },
  { sc: '2.2.1', name: 'Timing Adjustable', level: 'Not applicable', remarks: 'No time limits.' },
  {
    sc: '2.2.2',
    name: 'Pause, Stop, Hide',
    level: 'Supports',
    remarks:
      'The landing animation lasts under 5 seconds and has a Pause button. It does not play with reduced motion.',
  },
  {
    sc: '2.3.1',
    name: 'Three Flashes or Below Threshold',
    level: 'Supports',
    remarks: 'Nothing flashes.',
  },
  {
    sc: '2.4.1',
    name: 'Bypass Blocks',
    level: 'Supports',
    remarks: 'Skip link, landmarks, and F6 region cycling in the planner.',
  },
  {
    sc: '2.4.2',
    name: 'Page Titled',
    level: 'Supports',
    remarks: 'Every page has a unique title.',
  },
  {
    sc: '2.4.3',
    name: 'Focus Order',
    level: 'Supports',
    remarks:
      'Dialogs move focus to their first field and return it to the control that opened them.',
  },
  {
    sc: '2.4.4',
    name: 'Link Purpose (In Context)',
    level: 'Supports',
    remarks: 'Link text says where it goes.',
  },
  {
    sc: '2.5.1',
    name: 'Pointer Gestures',
    level: 'Supports',
    remarks: 'Pinch and two-finger pan have button and keyboard equivalents.',
  },
  {
    sc: '2.5.2',
    name: 'Pointer Cancellation',
    level: 'Supports',
    remarks: 'Actions complete on pointer up.',
  },
  {
    sc: '2.5.3',
    name: 'Label in Name',
    level: 'Supports',
    remarks: 'Tool rail buttons show their text labels, which are their accessible names.',
  },
  { sc: '2.5.4', name: 'Motion Actuation', level: 'Not applicable', remarks: 'No motion input.' },
  { sc: '3.1.1', name: 'Language of Page', level: 'Supports', remarks: 'lang="en" on every page.' },
  {
    sc: '3.2.1',
    name: 'On Focus',
    level: 'Supports',
    remarks: 'Focus never triggers a change of context.',
  },
  {
    sc: '3.2.2',
    name: 'On Input',
    level: 'Supports',
    remarks: 'Changing a field updates the plan in place; nothing navigates away.',
  },
  {
    sc: '3.2.6',
    name: 'Consistent Help',
    level: 'Supports',
    remarks:
      'Help is in the same place in the header and footer of every page, and behind ? in the planner.',
  },
  {
    sc: '3.3.1',
    name: 'Error Identification',
    level: 'Supports',
    remarks: 'Field errors are shown in text next to the field and linked to it.',
  },
  {
    sc: '3.3.2',
    name: 'Labels or Instructions',
    level: 'Supports',
    remarks: 'Every field has a visible label with its unit.',
  },
  {
    sc: '3.3.7',
    name: 'Redundant Entry',
    level: 'Supports',
    remarks:
      'The zoo name is reused for the title block and file names; species details are reused from the library.',
  },
  {
    sc: '4.1.2',
    name: 'Name, Role, Value',
    level: 'Partially supports',
    remarks:
      'Native elements and tested patterns are used throughout. The custom map editor’s screen-reader behaviour is still being tested across platforms.',
  },
];

const AA: AcrRow[] = [
  { sc: '1.2.4', name: 'Captions (Live)', level: 'Not applicable', remarks: 'No live media.' },
  {
    sc: '1.2.5',
    name: 'Audio Description (Prerecorded)',
    level: 'Not applicable',
    remarks: 'No video.',
  },
  {
    sc: '1.3.4',
    name: 'Orientation',
    level: 'Supports',
    remarks: 'Works in portrait and landscape.',
  },
  {
    sc: '1.3.5',
    name: 'Identify Input Purpose',
    level: 'Not applicable',
    remarks: 'No fields collect personal data.',
  },
  {
    sc: '1.4.3',
    name: 'Contrast (Minimum)',
    level: 'Supports',
    remarks: 'All text meets 4.5:1 in light, dark and high-contrast modes (checked automatically).',
  },
  {
    sc: '1.4.4',
    name: 'Resize Text',
    level: 'Supports',
    remarks: 'Sizes use rem; text resizes to 200%.',
  },
  { sc: '1.4.5', name: 'Images of Text', level: 'Supports', remarks: 'No images of text.' },
  {
    sc: '1.4.10',
    name: 'Reflow',
    level: 'Partially supports',
    remarks:
      'Content pages and planner panels reflow at 320 px. The map itself is a two-dimensional exception.',
  },
  {
    sc: '1.4.11',
    name: 'Non-text Contrast',
    level: 'Supports',
    remarks:
      'Every map shape has a two-tone outline that is at least 3:1 against its surroundings; controls and focus indicators meet 3:1.',
  },
  {
    sc: '1.4.12',
    name: 'Text Spacing',
    level: 'Supports',
    remarks: 'No fixed-height text containers.',
  },
  {
    sc: '1.4.13',
    name: 'Content on Hover or Focus',
    level: 'Supports',
    remarks: 'The drawing readout can be dismissed with Esc and doesn’t cover the pointer.',
  },
  {
    sc: '2.4.5',
    name: 'Multiple Ways',
    level: 'Supports',
    remarks: 'Header and footer navigation on every page; Help has a contents list.',
  },
  {
    sc: '2.4.6',
    name: 'Headings and Labels',
    level: 'Supports',
    remarks: 'Descriptive headings and labels.',
  },
  {
    sc: '2.4.7',
    name: 'Focus Visible',
    level: 'Supports',
    remarks: 'A two-colour focus ring on every control and map object.',
  },
  {
    sc: '2.4.11',
    name: 'Focus Not Obscured (Minimum)',
    level: 'Partially supports',
    remarks:
      'The map pans to keep focused objects in view; this is still being tested at small screen sizes.',
  },
  {
    sc: '2.5.7',
    name: 'Dragging Movements',
    level: 'Supports',
    remarks: 'Every drag has a click, keyboard or typed alternative.',
  },
  {
    sc: '2.5.8',
    name: 'Target Size (Minimum)',
    level: 'Supports',
    remarks: 'Targets are at least 24 × 24 px, including the hit areas of shape handles.',
  },
  {
    sc: '3.1.2',
    name: 'Language of Parts',
    level: 'Supports',
    remarks: 'Scientific names are Latin binomials, which are treated as proper names.',
  },
  {
    sc: '3.2.3',
    name: 'Consistent Navigation',
    level: 'Supports',
    remarks: 'Header and footer links are identical on every page.',
  },
  {
    sc: '3.2.4',
    name: 'Consistent Identification',
    level: 'Supports',
    remarks: 'The same action has the same label everywhere.',
  },
  {
    sc: '3.3.3',
    name: 'Error Suggestion',
    level: 'Supports',
    remarks: 'Errors say what is allowed, e.g. “Width must be between 1 and 1,000 m”.',
  },
  {
    sc: '3.3.4',
    name: 'Error Prevention (Legal, Financial, Data)',
    level: 'Supports',
    remarks: 'Deleting plans or data asks for confirmation; most edits can be undone.',
  },
  {
    sc: '3.3.8',
    name: 'Accessible Authentication (Minimum)',
    level: 'Not applicable',
    remarks: 'No sign-in.',
  },
  {
    sc: '4.1.3',
    name: 'Status Messages',
    level: 'Supports',
    remarks:
      'Results are announced in a throttled polite live region; save errors in an assertive one.',
  },
];

export const acr = {
  lead: 'A draft report of how the site meets each WCAG 2.2 success criterion, in the structure of the ITI VPAT® International edition.',
  draftNote:
    'Draft. This report is a self-assessment made while the site is being built. It has not yet been checked by an independent audit, and it will be revised after the full audit.',
  productHeading: 'Product information',
  product: [
    ['Name', SITE_NAME],
    ['Version', 'Pre-release (0.x)'],
    ['Report date', longDate(DATES.accessibilityStatement)],
    ['Contact', CONTACT.feedbackUrl],
    [
      'Evaluation methods',
      'Automated testing with axe-core in Chromium, Firefox and WebKit; keyboard-only test scripts; design review against WCAG 2.2. Manual audit and assistive technology testing in progress.',
    ],
    [
      'Standards covered',
      'WCAG 2.2 Levels A and AA; Revised Section 508 (via WCAG); EN 301 549 v4.1.1 clause 9 (via WCAG) and clauses 11.7 and 12',
    ],
  ] as const,
  termsHeading: 'Terms',
  terms: [
    ['Supports', 'The functionality meets the criterion without known defects.'],
    [
      'Partially supports',
      'Some functionality does not yet meet the criterion, or testing isn’t complete.',
    ],
    ['Does not support', 'Most functionality does not meet the criterion.'],
    ['Not applicable', 'The criterion is not relevant to the product.'],
  ] as const,
  tableA: {
    heading: 'WCAG 2.2 Level A',
    caption: 'Conformance with WCAG 2.2 Level A success criteria',
    rows: A,
  },
  tableAA: {
    heading: 'WCAG 2.2 Level AA',
    caption: 'Conformance with WCAG 2.2 Level AA success criteria',
    rows: AA,
  },
  head: ['Criterion', 'Conformance level', 'Remarks'] as const,
  obsoleteNote:
    '4.1.1 Parsing is obsolete in WCAG 2.2 and always satisfied. The site still ships valid HTML.',
  enHeading: 'EN 301 549 additional clauses',
  en: [
    [
      '11.7 User preferences',
      'Supports',
      'Follows the system colour scheme, contrast, reduced motion, text size and forced colours. No colours are forced over user styles.',
    ],
    [
      '12.1.1 / 12.2.1 Documentation and support',
      'Supports',
      'Help and this report are accessible HTML and describe the accessibility features.',
    ],
    [
      '10 Non-web documents',
      'Partially supports',
      'SVG exports include a title, description and text legend; the text summary export is the accessible equivalent of the poster. Printed PDFs are not tagged.',
    ],
  ] as const,
};

// ───────── Accessibility statement ─────────
export const accessibilityStatement: { lead: string; blocks: Block[] } = {
  lead: `${SITE_NAME} is built so that everyone can plan a zoo, including people who use a keyboard, screen reader, switch, voice control or screen magnifier.`,
  blocks: [
    { h2: 'Our target', id: 'target' },
    {
      p: 'We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA, which is also the international standard ISO/IEC 40500:2025. That level is the basis of US federal Section 508 rules and of the European standard EN 301 549 (version 4.1.1), and we also follow EN 301 549’s requirements to respect your device’s preferences.',
    },
    { h2: 'Conformance status', id: 'status' },
    {
      p: [
        { strong: 'Partially conforms.' },
        ' Some parts of the site may not yet fully meet WCAG 2.2 AA. We test every page automatically and by keyboard, but a full manual audit and screen-reader testing on every platform haven’t been completed yet. We’ll update this status after that audit.',
      ],
    },
    { h2: 'Accessibility features', id: 'features' },
    {
      ul: [
        'Everything in the planner works with a keyboard alone. Single-key shortcuts only work while the map has focus, and you can turn them off.',
        'No action needs dragging or a precise pointer. Every shape can be drawn with the keyboard crosshair, or created and edited by typing its size and position.',
        'The Objects panel lists everything on the map with its type, size and animals, so the plan can be read and edited without seeing the map.',
        'Results such as new areas, undo and saving are announced to screen readers without flooding them.',
        'Colour is never the only signal: zone types also have patterns, labels and icons.',
        'The site follows your system settings for dark mode, more contrast, reduced motion and Windows high-contrast (forced colours).',
        'The typeface, Atkinson Hyperlegible, was designed for readers with low vision.',
        'Text can be resized to 200% and pages reflow down to 320 pixels wide.',
      ],
    },
    { h2: 'Known limitations', id: 'limitations' },
    {
      ul: [
        [
          { strong: 'The map is a visual drawing surface. ' },
          'Screen-reader users can do everything through the Objects panel and the Inspector form instead.',
        ],
        [
          { strong: 'The optional Poster map style can lower contrast. ' },
          'It’s off by default; the Clear style meets the contrast requirements and is one click away in Map settings.',
        ],
        [
          { strong: 'PNG exports are pictures. ' },
          'Use the text summary export (HTML, CSV or Markdown) or the SVG export, which includes a text legend.',
        ],
        [
          { strong: 'Printed posters and PDFs come from your browser’s print feature ' },
          'and aren’t tagged PDFs. The text summary export is the accessible equivalent.',
        ],
        [
          { strong: 'Screen-reader testing is still in progress ' },
          'for JAWS, VoiceOver on iOS and TalkBack. Please tell us about anything that doesn’t work.',
        ],
      ],
    },
    { h2: 'Compatibility', id: 'compatibility' },
    {
      p: 'The site is designed to work with the last two versions of Chrome, Edge, Firefox and Safari, including on iPad and Android tablets, and with these assistive technologies:',
    },
    {
      table: {
        caption: 'Assistive technology we test with',
        head: ['Assistive technology', 'Browser', 'System'],
        rows: [
          ['NVDA', 'Firefox, Chrome', 'Windows 11'],
          ['JAWS', 'Chrome', 'Windows 11'],
          ['Narrator', 'Edge', 'Windows 11'],
          ['VoiceOver', 'Safari', 'macOS and iOS'],
          ['TalkBack', 'Chrome', 'Android'],
          ['Voice Control, Dragon', 'Safari, Chrome', 'macOS, Windows'],
          ['High-contrast mode (forced colours)', 'Edge', 'Windows 11'],
        ],
      },
    },
    { h2: 'Technologies we rely on', id: 'technologies' },
    {
      p: 'HTML, CSS, JavaScript, WAI-ARIA and SVG. The content pages work without JavaScript; the planner needs it.',
    },
    { h2: 'How we test', id: 'assessment' },
    {
      ul: [
        'Automated checks with axe-core on every page and on key planner states, in light, dark and forced-colours modes, in Chromium, Firefox and WebKit, on every change.',
        'Keyboard-only test scripts for the main planner tasks, run on every change.',
        'Manual checks against WCAG 2.2 using the US Trusted Tester method (in progress).',
        'Screen-reader task scripts on the platforms above (in progress).',
      ],
    },
    {
      p: [
        'Read the detailed ',
        { text: 'accessibility conformance report', href: '/accessibility/report' },
        ', which lists every WCAG 2.2 success criterion.',
      ],
    },
    { h2: 'Feedback', id: 'feedback' },
    {
      p: [
        'If something doesn’t work for you, please ',
        { text: 'tell us on GitHub', href: CONTACT.feedbackUrl },
        '. Say which page or tool you were using and what assistive technology, if any. We aim to reply within 5 business days.',
      ],
    },
    { h2: 'About this statement', id: 'about' },
    {
      p: `This statement was written on ${longDate(DATES.accessibilityStatement)} and last reviewed on ${longDate(DATES.accessibilityStatement)}.`,
    },
  ],
};
