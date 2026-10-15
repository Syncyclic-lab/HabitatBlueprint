/** Scale bar and grid density for the map view. */

/** The largest 1, 2 or 5 × 10ⁿ that does not exceed `max` (for max > 0). */
export function niceLength(max: number): number {
  const exp = Math.floor(Math.log10(max));
  const base = 10 ** exp;
  const f = max / base;
  const nice = f >= 5 ? 5 : f >= 2 ? 2 : 1;
  return nice * base;
}

export interface ScaleBar {
  meters: number;
  px: number;
}

/** A scale bar no longer than `maxPx` on screen, labelled with a round number of meters. */
export function scaleBar(pxPerMeter: number, maxPx = 120): ScaleBar {
  const meters = niceLength(maxPx / pxPerMeter);
  return { meters, px: meters * pxPerMeter };
}

/** Grid steps the planner offers and thins through (meters). */
export const GRID_STEPS_M = [0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000] as const;

/**
 * The step to draw: the chosen minor step, or the next larger standard step if lines would
 * be closer than `minPx` on screen (docs/03 §2.1). Null if even the largest is too dense.
 */
export function visibleGridStep(minorM: number, pxPerMeter: number, minPx = 6): number | null {
  for (const step of GRID_STEPS_M) {
    if (step >= minorM && step * pxPerMeter >= minPx) return step;
  }
  return null;
}
