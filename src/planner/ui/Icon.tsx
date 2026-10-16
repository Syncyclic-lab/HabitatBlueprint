import { ICONS, type IconId } from '../../assets/icons/icons.ts';

export interface IconProps {
  /** Which icon to draw. */
  id: IconId;
  /** Size in CSS pixels (default 20). */
  size?: number;
  className?: string;
}

/** A decorative icon. Always hidden from assistive technology: label the control instead. */
export function Icon({ id, size = 20, className }: IconProps) {
  const def = ICONS[id];
  const stroke = 'stroke' in def && def.stroke;
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {stroke ? (
        <path d={def.d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={def.d} fill="currentColor" fillRule="evenodd" />
      )}
    </svg>
  );
}
