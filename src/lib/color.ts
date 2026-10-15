/** WCAG colour maths: relative luminance, contrast ratio and best ink for a fill. */

export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || m[1] === undefined) throw new Error(`Not a #RRGGBB colour: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever contrasts more with the fill (docs/07 label/icon ink rule). */
export function bestInk(fill: string): '#000000' | '#FFFFFF' {
  return contrastRatio(fill, '#000000') >= contrastRatio(fill, '#FFFFFF') ? '#000000' : '#FFFFFF';
}
