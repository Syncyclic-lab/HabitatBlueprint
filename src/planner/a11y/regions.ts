/**
 * F6 / Shift+F6 cycle focus between the planner's regions (docs/03 §1): top bar, tool rail,
 * map, details panel, status bar. Each region is marked data-region; its preferred focus target
 * is marked data-region-focus (else its first focusable element, else the region itself).
 */
export const REGION_ORDER = ['top', 'tools', 'map', 'panel', 'status'] as const;
export type RegionId = (typeof REGION_ORDER)[number];

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function regionEl(root: ParentNode, id: RegionId): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-region="${id}"]`);
}

/** Focuses a region's preferred element. Returns false if the region isn't on screen. */
export function focusRegion(id: RegionId, root: ParentNode = document): boolean {
  const region = regionEl(root, id);
  if (!region || region.offsetParent === null) return false;
  const target =
    region.querySelector<HTMLElement>('[data-region-focus]') ??
    region.querySelector<HTMLElement>('[aria-pressed="true"], [aria-selected="true"]') ??
    region.querySelector<HTMLElement>(FOCUSABLE) ??
    region;
  if (target === region && !region.hasAttribute('tabindex')) region.tabIndex = -1;
  target.focus();
  return true;
}

export function currentRegion(active: Element | null): RegionId | null {
  const el = active?.closest<HTMLElement>('[data-region]');
  const id = el?.dataset.region as RegionId | undefined;
  return id && (REGION_ORDER as readonly string[]).includes(id) ? id : null;
}

/** Moves focus to the next (or previous) region that's visible. */
export function cycleRegion(direction: 1 | -1, root: ParentNode = document): void {
  const current = currentRegion(document.activeElement);
  let index = current ? REGION_ORDER.indexOf(current) : direction === 1 ? -1 : 0;
  for (let i = 0; i < REGION_ORDER.length; i++) {
    index = (index + direction + REGION_ORDER.length) % REGION_ORDER.length;
    if (focusRegion(REGION_ORDER[index] as RegionId, root)) return;
  }
}
