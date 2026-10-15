/**
 * Every icon used on the site and in the planner, drawn for this project on a 24 × 24 grid.
 * Source and licence for each id are recorded in ./manifest.json (a unit test keeps the two in
 * step). Nothing here is traced from or based on game art (docs/10-legal-and-ip.md §3).
 *
 * Fill icons use the even-odd rule so holes read clearly at small sizes.
 * Stroke icons (`stroke: true`) are drawn with a 2px round stroke.
 */
export interface IconDef {
  d: string;
  stroke?: boolean;
}

export const ICONS = {
  // ───────── Facilities and buildings ─────────
  restroom: {
    d: 'M7 2a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM5 7h4a1 1 0 0 1 1 1v6H8.6v7H7.3v-6.5h-.6V21H5.4v-7H4V8a1 1 0 0 1 1-1zM11.4 2h1.2v20h-1.2zM17 2a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM15.6 7h2.8l2.6 8h-2.4v6h-1.3v-6h-.6v6h-1.3v-6H13z',
  },
  food: {
    d: 'M5 2h1v6h1V2h1v6h1V2h1v7a2.2 2.2 0 0 1-1.6 2.1V22H6.6V11.1A2.2 2.2 0 0 1 5 9zM15 2c2.3 0 3.6 3.6 3.6 8.2H17V22h-2z',
  },
  drink: {
    d: 'M5 6h14v2H5zM6.3 9h11.4l-1.4 13H7.7zM12.2 5.2 14.4 1h1.8l-2.2 4.2z',
  },
  gift: {
    d: 'M4 11h6.6v11H4zM13.4 11H20v11h-6.6zM3 7h7.6v3H3zM13.4 7H21v3h-7.6zM12 7c-1.2-2.6-4.8-3.6-5-1.8C6.8 6.8 9.6 7 12 7zm0 0c1.2-2.6 4.8-3.6 5-1.8.2 1.6-2.6 1.8-5 1.8z',
  },
  info: {
    d: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zm0 2a8 8 0 1 1 0 16a8 8 0 1 1 0-16zM12 6.3a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2zM10.5 11h3v7h-3z',
  },
  'first-aid': {
    d: 'M3 3h18v18H3zM10 6v4H6v4h4v4h4v-4h4v-4h-4V6z',
  },
  staff: {
    d: 'M12 6.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM8 5.4a4 3.2 0 0 1 8 0v.9H8zM6.8 6.3h10.4v1.3H6.8zM5 22v-4a7 4.5 0 0 1 14 0v4z',
  },
  entrance: {
    d: 'M13 2h8v20h-8v-2h6V4h-6zM2 10.8h8.2V7l5.3 5-5.3 5v-3.8H2z',
  },
  exit: {
    d: 'M3 2h8v2H5v16h6v2H3zM8.5 10.8h8.2V7l5.3 5-5.3 5v-3.8H8.5z',
  },
  transport: {
    d: 'M10 2h4v2h-4zM6 4.5h12a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2zm.5 2.5v5h11V7zM7.5 14.2a1.2 1.2 0 1 0 0 2.4a1.2 1.2 0 1 0 0-2.4zm9 0a1.2 1.2 0 1 0 0 2.4a1.2 1.2 0 1 0 0-2.4zM7 19.5h2.2L7.6 22H5.3zm10 0h-2.2l1.6 2.5h2.3z',
  },
  viewing: {
    d: 'M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 2.6a4.4 4.4 0 1 1 0 8.8a4.4 4.4 0 1 1 0-8.8zM12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4z',
  },
  education: {
    d: 'M3 3h18v11H3zm1.6 1.6v7.8h14.8V4.6zM6.5 6.5h6v1.4h-6zm0 2.6h9v1.4h-9zM11 14h2v3.8l3.2 4.2h-2.5L12 19.6 10.3 22H7.8l3.2-4.2z',
  },
  bench: {
    d: 'M4 5h16v2H4zM6 7h1.5v3H6zm10.5 0H18v3h-1.5zM3 10h18v2H3zm2 2h2v7H5zm12 0h2v7h-2z',
  },
  photo: {
    d: 'M3 7h4l2-3h6l2 3h4v13H3zm9 2.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9zm0 2a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
  },
  trash: {
    d: 'M9 2.5h6v2H9zM4 5h16v2H4zM6 8h12l-1 14H7zm3 2v10h1.2V10zm2.4 0v10h1.2V10zm2.4 0v10H15V10z',
  },
  atm: {
    d: 'M2 5h20v14H2zm1.5 1.5v2h17v-2zm0 4.5v6.5h17V11zM5 13.5h5V15H5z',
  },
  person: {
    d: 'M12 2.5a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 1 1 0-7.2zM5 22v-5.5a7 5.5 0 0 1 14 0V22z',
  },
  'building-animal-house': {
    d: 'M12 2l10 8v12H2V10zm-3.2 9.3a1.3 1.6 0 1 0 0 3.2a1.3 1.6 0 1 0 0-3.2zm6.4 0a1.3 1.6 0 1 0 0 3.2a1.3 1.6 0 1 0 0-3.2zm-4.5-2a1.2 1.5 0 1 0 0 3a1.2 1.5 0 1 0 0-3zm2.6 0a1.2 1.5 0 1 0 0 3a1.2 1.5 0 1 0 0-3zM12 14c-2 0-3.4 2-3.4 3.4 0 1.2.9 1.8 1.8 1.8.7 0 1-.4 1.6-.4s.9.4 1.6.4c.9 0 1.8-.6 1.8-1.8 0-1.4-1.4-3.4-3.4-3.4z',
  },
  research: {
    d: 'M8.5 2h7v2h-1.2v5.2l5.9 9.6A2.1 2.1 0 0 1 18.4 22H5.6a2.1 2.1 0 0 1-1.8-3.2l5.9-9.6V4H8.5zm3 7.8L8.8 14h6.4l-2.7-4.2z',
  },
  vet: {
    d: 'M8 3.5h8V7h-2V5.5h-4V7H8zM3 7h18v14H3zm8 3v3H8v2h3v3h2v-3h3v-2h-3v-3z',
  },
  paw: {
    d: 'M12 11.5c-3.4 0-5.8 3.6-5.8 6 0 2 1.4 3 2.9 3 1.2 0 2-.6 2.9-.6s1.7.6 2.9.6c1.5 0 2.9-1 2.9-3 0-2.4-2.4-6-5.8-6zM5.8 7a2 2.4 0 1 0 0 4.8a2 2.4 0 1 0 0-4.8zm12.4 0a2 2.4 0 1 0 0 4.8a2 2.4 0 1 0 0-4.8zM9.3 3a2.1 2.6 0 1 0 0 5.2a2.1 2.6 0 1 0 0-5.2zm5.4 0a2.1 2.6 0 1 0 0 5.2a2.1 2.6 0 1 0 0-5.2z',
  },
  tree: {
    d: 'M12 2a7 7 0 0 1 2 13.7V22h-4v-6.3A7 7 0 0 1 12 2z',
  },
  'water-drop': {
    d: 'M12 2c4 5 7 9 7 13a7 7 0 0 1-14 0c0-4 3-8 7-13z',
  },
  fountain: {
    d: 'M11 3h2v8h-2zM12 4c3 0 5 2 5 4h-1.6c0-1.2-1.6-2.4-3.4-2.4S8.6 6.8 8.6 8H7c0-2 2-4 5-4zM3 13h18v2.5H3zM5 15.5h14L17 21H7z',
  },
  ticket: {
    d: 'M2 6h20v4a2 2 0 0 0 0 4v4H2v-4a2 2 0 0 0 0-4zm11 2v1.5h1.5V8zm0 3.2v1.6h1.5v-1.6zm0 3.3V16h1.5v-1.5z',
  },

  // ───────── Animal silhouettes by legend category ─────────
  'sil-herbivore': {
    d: 'M4.4 9.4C6.6 8.3 13.5 8.2 16 9.1l1.9-3.6-1.3-2.9h.9l1.2 2.4.5-2.4h.8l-.3 3.2c1 .5 1.8 1.4 1.6 2.5h-2l-1.5 2.2c0 2-.5 3-1.6 4V21h-1.5l-.6-5c-2 .5-4.1.5-6.1 0L7.1 21H5.6l.4-6.1c-1.4-1-2-2.5-2-4.4 0-.4.1-.8.4-1.1z',
  },
  'sil-predator': {
    d: 'M2.5 13.6c0-1.6 1-3.1 3.2-3.6l9.3-.6c1-1.6 2.6-2.8 4.3-2.8l.7-1.1.8 1.1c1.1.3 1.7 1.1 1.7 2.1l-1 1-1.6.3c0 1.6-.6 3-1.6 4V21h-1.5l-.7-5.6c-2.6.8-5.6.8-8.2 0L7.2 21H5.7l.3-6.6c-1-.5-1.6-1.2-1.8-2-1 .1-1.5.8-1.7 1.7L2.2 19H1.5z',
  },
  'sil-primate': {
    d: 'M12 2.2a3.1 3.1 0 0 0-3.1 3.1c0 1 .4 1.8 1 2.4C7.4 8.4 5.8 10.6 5.8 13.4V20H4.3v2h4.5v-2h-1v-3.4l2.1 1V22h4.2v-4.4l2.1-1V20h-1v2h4.5v-2h-1.5v-6.6c0-2.8-1.6-5-4.1-5.7.6-.6 1-1.4 1-2.4A3.1 3.1 0 0 0 12 2.2z',
  },
  'sil-bird': {
    d: 'M15.4 3a3.2 3.2 0 0 0-3.1 2.6C8.2 6 4.3 9 3 14.2l5-1.6c1 2.1 3 3.1 5.1 3.1L12 21h1.5l1.6-4.8.8 4.8h1.5l-.5-5.2c2-1.5 3-4 3-7l2.6-1-2.7-1A3.2 3.2 0 0 0 15.4 3z',
  },
  'sil-reptile': {
    d: 'M12 1.4c1.3 0 2.2 1.1 2.2 2.6 0 1-.4 1.7-.9 2.1l.5.9 3.4-2.2 1.1 1.3-4.5 3.1v3.1l4.5 3.1-1.1 1.3-3.4-2.2c-.2 1.3-.7 2.4-1.1 3.4l-.7 4.7-.7-4.7c-.4-1-.9-2.1-1.1-3.4l-3.4 2.2-1.1-1.3 4.5-3.1V9.2L5.7 6.1l1.1-1.3 3.4 2.2.5-.9c-.5-.4-.9-1.1-.9-2.1 0-1.5.9-2.6 2.2-2.6z',
  },
  'sil-amphibian': {
    d: 'M8 3.6a2.1 2.1 0 0 0-2.1 2.1c0 .8.5 1.5 1.2 1.9C6 8.8 5.4 10.4 5.4 12c0 1 .3 2 .8 2.8L2.9 18l1 1 3.5-2.8c.8.7 1.9 1.2 3.1 1.4L9 21h1.5l1.5-2.3 1.5 2.3H15l-1.5-3.4c1.2-.2 2.3-.7 3.1-1.4l3.5 2.8 1-1-3.3-3.2c.5-.8.8-1.8.8-2.8 0-1.6-.6-3.2-1.7-4.4.7-.4 1.2-1.1 1.2-1.9a2.1 2.1 0 0 0-4.1-.6c-.6-.2-1.3-.3-2-.3s-1.4.1-2 .3A2.1 2.1 0 0 0 8 3.6z',
  },
  'sil-fish': {
    d: 'M1.5 12c3-4 7-6.2 11.2-6.2 3 0 5.5 1.5 7.5 4L23 6.8v10.4l-2.8-3c-2 2.5-4.5 4-7.5 4C8.5 18.2 4.5 16 1.5 12zm5.6-1.6a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 1 0 0-2.2z',
  },
  'sil-invertebrate': {
    d: 'M11.4 6h1.2v13h-1.2zM11.2 8C10.3 4.8 7.3 2.4 4.6 2.4c-1.9 0-2.8 1.5-2.3 4 .5 2.5 2 4.3 5 4.9-2.9.6-4.3 2.4-3.9 4.4.5 2.4 3 3.4 5 2.4 1.9-1 2.6-3.1 2.8-5.3zm1.6 0c.9-3.2 3.9-5.6 6.6-5.6 1.9 0 2.8 1.5 2.3 4-.5 2.5-2 4.3-5 4.9 2.9.6 4.3 2.4 3.9 4.4-.5 2.4-3 3.4-5 2.4-1.9-1-2.6-3.1-2.8-5.3z',
  },

  // ───────── Tools and interface ─────────
  'tool-select': { d: 'M5 2.5 19 13l-6.2.9 3.7 6.9-2.4 1.3-3.7-6.9L5.9 19z' },
  'tool-habitat': { d: 'M4 6 11 3l9 4-1 10-8 4-7-5zm2 1.4L6.6 15l5 3.6 5.6-2.8.7-7.6-6.9-3.1z' },
  'tool-building': { d: 'M3 21V9l9-6 9 6v12h-6.5v-6h-5v6zm2-2h2.5v-6h9v6H19v-8.9l-7-4.7-7 4.7z' },
  'tool-path': {
    d: 'M6 22c0-4 2-6.5 5-8.2 2.6-1.5 4.4-3.2 4.4-5.6 0-2-1.2-3.8-3.4-5.2',
    stroke: true,
  },
  'tool-barrier': {
    d: 'M4 4h2v16H4zm7 0h2v16h-2zm7 0h2v16h-2zM2 8h2v2H2zm4 0h5v2H6zm7 0h5v2h-5zm7 0h2v2h-2zM2 14h2v2H2zm4 0h5v2H6zm7 0h5v2h-5zm7 0h2v2h-2z',
  },
  'tool-water': {
    d: 'M2 8c2.5-2 5-2 7.5 0s5 2 7.5 0 4-1.5 5 0M2 13c2.5-2 5-2 7.5 0s5 2 7.5 0 4-1.5 5 0M2 18c2.5-2 5-2 7.5 0s5 2 7.5 0 4-1.5 5 0',
    stroke: true,
  },
  'tool-planting': {
    d: 'M12 22v-9m0 0C12 8 8.5 4.5 3.5 4.5 3.5 9.5 7 13 12 13zm0 0c0-4.5 3.5-8 8.5-8 0 5-3.5 8.5-8.5 8.5',
    stroke: true,
  },
  'tool-icon': {
    d: 'M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  },
  'tool-label': { d: 'M4 3h16v4.5h-2V5h-5v14h2.5v2h-7v-2H11V5H6v2.5H4z' },
  'tool-measure': {
    d: 'M2.6 15.4 15.4 2.6l6 6L8.6 21.4zm3 0 3 3 1.4-1.4-1.5-1.5 1-1 1.5 1.5 1.4-1.4-2.5-2.5 1-1 2.5 2.5 1.4-1.4-1.5-1.5 1-1 1.5 1.5 1.4-1.4-2.5-2.5 1-1 2.5 2.5 1.4-1.4-3-3z',
  },
  undo: { d: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11', stroke: true },
  redo: { d: 'm15 14 5-5-5-5m5 5H9.5a5.5 5.5 0 0 0 0 11H13', stroke: true },
  plus: { d: 'M12 5v14M5 12h14', stroke: true },
  minus: { d: 'M5 12h14', stroke: true },
  fit: { d: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5', stroke: true },
  menu: { d: 'M4 6h16M4 12h16M4 18h16', stroke: true },
  close: { d: 'M6 6l12 12M18 6 6 18', stroke: true },
  'chevron-down': { d: 'm6 9 6 6 6-6', stroke: true },
  'chevron-right': { d: 'm9 6 6 6-6 6', stroke: true },
  more: {
    d: 'M5 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4zm7 0a2 2 0 1 0 0 4a2 2 0 1 0 0-4zm7 0a2 2 0 1 0 0 4a2 2 0 1 0 0-4z',
  },
  lock: { d: 'M7 10V7a5 5 0 0 1 10 0v3h2v12H5V10zm2 0h6V7a3 3 0 0 0-6 0zm2 4v4h2v-4z' },
  unlock: { d: 'M7 10V7a5 5 0 0 1 9.6-2l-1.8.9A3 3 0 0 0 9 7v3h10v12H5V10zm4 4v4h2v-4z' },
  eye: {
    d: 'M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 3a4 4 0 1 1 0 8a4 4 0 1 1 0-8z',
  },
  'eye-off': {
    d: 'M3.3 2 22 20.7 20.7 22l-3.4-3.4A10.6 10.6 0 0 1 12 20C6 20 2 13 2 13s1.6-2.8 4.3-4.9L2 3.3zM8.4 10.2A4 4 0 0 0 14 15.8zM12 6c6 0 10 7 10 7s-.9 1.6-2.5 3.3L15.9 12.7A4 4 0 0 0 11.3 8.1L9 5.8C9.9 5.6 10.9 6 12 6z',
  },
  copy: { d: 'M8 3h12v12h-3v6H4V9h4zm2 2v8h8V5zM6 11v8h9v-4h-7v-4z' },
  check: { d: 'm4 12.5 5 5L20 6.5', stroke: true },
  warning: { d: 'M12 2 23 21H1zm-1 6.5v6h2v-6zm0 8v2h2v-2z' },
  error: { d: 'M12 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20zm-1 5v7h2V7zm0 8.5v2h2v-2z' },
  question: {
    d: 'M12 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20zm0 4a3.6 3.6 0 0 0-3.6 3.4h2.1A1.5 1.5 0 1 1 12 11c-.6 0-1 .4-1 1v2h2v-1.2a3.6 3.6 0 0 0-1-6.8zm-1 9.5v2h2v-2z',
  },
  settings: {
    d: 'M10.2 2h3.6l.5 2.6 1.6.9 2.5-.9 1.8 3.1-2 1.7v1.2l2 1.7-1.8 3.1-2.5-.9-1.6.9-.5 2.6h-3.6l-.5-2.6-1.6-.9-2.5.9L3.8 14.4l2-1.7v-1.2l-2-1.7 1.8-3.1 2.5.9 1.6-.9zM12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z',
  },
  download: { d: 'M12 3v12m0 0-5-5m5 5 5-5M4 20h16', stroke: true },
  upload: { d: 'M12 16V4m0 0L7 9m5-5 5 5M4 20h16', stroke: true },
  share: {
    d: 'M18 2.5a3 3 0 1 1-2.8 4.1L8.9 10a3 3 0 0 1 0 2l6.3 3.4A3 3 0 1 1 15 17l-6.9-3.7a3 3 0 1 1 0-4.6L15 5a3 3 0 0 1 3-2.5z',
  },
  layers: {
    d: 'M12 2 22 7.5 12 13 2 7.5zm-7.2 9.8L12 15.7l7.2-3.9L22 13.3 12 18.8 2 13.3zm0 4.6L12 20.3l7.2-3.9 2.8 1.5L12 23.4 2 17.9z',
  },
  north: { d: 'M12 2 18 21 12 17 6 21z' },
  crosshair: { d: 'M12 2v6M12 16v6M2 12h6M16 12h6', stroke: true },
  folder: { d: 'M2 5h7l2 2h11v13H2z' },
  image: {
    d: 'M3 4h18v16H3zm2 2v9.6l4-4.1 3.5 3.5 2.5-2.5L19 16.5V6zm10.5 1.5a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6z',
  },
  print: { d: 'M6 2h12v5h3v10h-3v5H6v-5H3V7h3zm2 2v3h8V4zm0 11v5h8v-5z' },
} satisfies Record<string, IconDef>;

export type IconId = keyof typeof ICONS;

export function isIconId(id: string): id is IconId {
  return Object.hasOwn(ICONS, id);
}

/** Facility icons offered by the Icon tool, in menu order (docs/03 §3.8). */
export const FACILITY_ICON_IDS = [
  'restroom',
  'food',
  'drink',
  'gift',
  'info',
  'first-aid',
  'staff',
  'entrance',
  'exit',
  'transport',
  'viewing',
  'education',
  'bench',
  'photo',
  'trash',
  'atm',
  'ticket',
  'fountain',
  'tree',
  'water-drop',
] as const satisfies readonly IconId[];

export type FacilityIconId = (typeof FACILITY_ICON_IDS)[number];
