/**
 * Number formatting for areas, lengths and percentages (CLAUDE.md "Units and geometry").
 * Areas round to 1 m², lengths to 0.1 m. Hectares are added from 10,000 m². Imperial is a
 * display option only. A narrow no-break space separates numbers from units.
 */
import { en } from '../i18n/en.ts';

export type Units = 'metric' | 'imperial';

const NBSP = ' ';
const M2_PER_FT2 = 0.09290304;
const M_PER_FT = 0.3048;
const M2_PER_ACRE = 4046.8564224;

const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const two = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Rounds -0 to 0 so we never print "-0". */
const clean = (n: number): number => (Object.is(Math.round(n), -0) ? 0 : n);

export function formatArea(m2: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    const ft2 = `${int.format(clean(m2 / M2_PER_FT2))}${NBSP}${en.units.ft2}`;
    return m2 >= 10_000 ? `${ft2} (${two.format(m2 / M2_PER_ACRE)}${NBSP}${en.units.acres})` : ft2;
  }
  const base = `${int.format(clean(m2))}${NBSP}${en.units.m2}`;
  return m2 >= 10_000 ? `${base} (${two.format(m2 / 10_000)}${NBSP}${en.units.ha})` : base;
}

/** The same figure in words, for screen readers: "1,842 square meters". */
export function speakArea(m2: number, units: Units = 'metric'): string {
  if (units === 'imperial') return `${int.format(clean(m2 / M2_PER_FT2))} ${en.units.squareFeet}`;
  return `${int.format(clean(m2))} ${en.units.squareMeters}`;
}

export function formatLength(m: number, units: Units = 'metric'): string {
  if (units === 'imperial') return `${one.format(m / M_PER_FT)}${NBSP}${en.units.ft}`;
  return `${one.format(m)}${NBSP}${en.units.m}`;
}

export function speakLength(m: number, units: Units = 'metric'): string {
  if (units === 'imperial') return `${one.format(m / M_PER_FT)} ${en.units.feet}`;
  return `${one.format(m)} ${en.units.meters}`;
}

/** A fraction as a percentage with two decimals: 0.001842 → "0.18%". */
export const formatPercent = (fraction: number): string => `${two.format(fraction * 100)}%`;

export const speakPercent = (fraction: number): string => `${two.format(fraction * 100)} percent`;

/** Plain number with up to two decimals, for inputs and coordinates. */
export const formatNumber = (n: number, digits = 2): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(clean(n));

/** Converts a length typed in the display unit back to meters. */
export const toMeters = (value: number, units: Units): number =>
  units === 'imperial' ? value * M_PER_FT : value;

export const fromMeters = (m: number, units: Units): number =>
  units === 'imperial' ? m / M_PER_FT : m;
