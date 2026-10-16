import type { ReactNode } from 'react';

export interface ScrollRegionProps {
  /** Accessible name for the region (usually the table's caption). */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * A horizontally scrollable wrapper for wide tables. It can take keyboard focus so people who
 * don't use a mouse can scroll it with the arrow keys (WCAG 2.1.1, axe scrollable-region-focusable).
 */
export function ScrollRegion({ label, children, className }: ScrollRegionProps) {
  return (
    <div
      className={className ? `table-wrap ${className}` : 'table-wrap'}
      role="region"
      aria-label={label}
      // A focusable region is the standard pattern for keyboard-scrollable content.
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
      tabIndex={0}
    >
      {children}
    </div>
  );
}
