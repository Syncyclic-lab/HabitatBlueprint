/**
 * Pattern definitions. Tiles are sized in meters from the current zoom so they look the same on
 * screen at every zoom. Each pattern exists in black and white ink (the one with more contrast
 * against the fill is used).
 */
import { memo } from 'react';
import { PATTERN_IDS, type PatternId } from '../../data/schemas.ts';

export const patternUrl = (id: PatternId, ink: string): string =>
  `url(#pat-${id}-${ink.toLowerCase() === '#ffffff' ? 'w' : 'b'})`;

function tile(id: PatternId, s: number, stroke: string): React.ReactNode {
  const w = s / 10; // stroke width: a tenth of the tile
  const common = { stroke, strokeWidth: w, fill: 'none' } as const;
  switch (id) {
    case 'mesh':
    case 'grid':
      return <path d={`M0 0H${s}M0 0V${s}`} {...common} />;
    case 'waves':
      return <path d={`M0 ${s / 2} Q${s / 4} ${s / 4} ${s / 2} ${s / 2} T${s} ${s / 2}`} {...common} />;
    case 'waves-dense':
      return (
        <path
          d={`M0 ${s / 4} Q${s / 4} 0 ${s / 2} ${s / 4} T${s} ${s / 4}M0 ${(3 * s) / 4} Q${s / 4} ${s / 2} ${s / 2} ${(3 * s) / 4} T${s} ${(3 * s) / 4}`}
          {...common}
        />
      );
    case 'crosshatch':
      return <path d={`M0 0L${s} ${s}M${s} 0L0 ${s}`} {...common} />;
    case 'diagonal':
      return <path d={`M0 ${s}L${s} 0M${-s / 2} ${s / 2}L${s / 2} ${-s / 2}M${s / 2} ${s * 1.5}L${s * 1.5} ${s / 2}`} {...common} />;
    case 'dots':
    case 'stipple':
      return <circle cx={s / 2} cy={s / 2} r={id === 'dots' ? s / 7 : s / 12} fill={stroke} />;
    case 'cross':
      return <path d={`M${s / 2} ${s * 0.2}V${s * 0.8}M${s * 0.2} ${s / 2}H${s * 0.8}`} {...common} />;
    case 'leaf-dots':
      return (
        <>
          <circle cx={s / 4} cy={s / 4} r={s / 8} fill={stroke} />
          <circle cx={(3 * s) / 4} cy={(3 * s) / 4} r={s / 8} fill={stroke} />
        </>
      );
    case 'horizontal':
      return <path d={`M0 ${s / 2}H${s}`} {...common} />;
    case 'vertical':
      return <path d={`M${s / 2} 0V${s}`} {...common} />;
    case 'zigzag':
      return <path d={`M0 ${s * 0.7}L${s / 4} ${s * 0.3}L${s / 2} ${s * 0.7}L${(3 * s) / 4} ${s * 0.3}L${s} ${s * 0.7}`} {...common} />;
    case 'chevron':
      return <path d={`M0 ${s * 0.7}L${s / 2} ${s * 0.3}L${s} ${s * 0.7}`} {...common} />;
    case 'rings':
      return <circle cx={s / 2} cy={s / 2} r={s / 4} {...common} />;
    default:
      return null;
  }
}

export interface PatternsProps {
  /** Screen pixels per meter. */
  zoom: number;
}

/** All patterns in both inks. Rendered once per zoom level change. */
export const Patterns = memo(function Patterns({ zoom }: PatternsProps) {
  const s = 10 / zoom;
  return (
    <>
      {PATTERN_IDS.filter((id) => id !== 'none').flatMap((id) =>
        (['b', 'w'] as const).map((ink) => (
          <pattern key={`${id}-${ink}`} id={`pat-${id}-${ink}`} width={s} height={s} patternUnits="userSpaceOnUse">
            {tile(id, s, ink === 'b' ? '#000000' : '#FFFFFF')}
          </pattern>
        )),
      )}
    </>
  );
});
