/** SVG layers of the map. All coordinates are meters; strokes that should look constant on
 * screen use non-scaling strokes or widths divided by the zoom. */
import { memo, type ReactNode } from 'react';
import type { BBox, Shape, Vec2 } from '../../geometry/types.ts';
import { shapeToPoly } from '../../geometry/flatten.ts';
import { polyArea, ringCentroid, signedArea } from '../../geometry/polygon.ts';
import { polylineLength } from '../../geometry/buffer.ts';
import { shapeVertices } from '../../geometry/transform.ts';
import { visibleGridStep } from '../../geometry/scale.ts';
import { ICONS, isIconId, type IconId } from '../../assets/icons/icons.ts';
import { getSpecies } from '../../data/index.ts';
import { bestInk } from '../../lib/color.ts';
import { formatArea, formatLength, type Units } from '../../lib/format.ts';
import { footprint } from '../../model/totals.ts';
import type { AnimalEntry, MapObject, Plan } from '../../model/types.ts';
import { linePath, multiPath, polyPath } from './paths.ts';
import { patternUrl } from './Patterns.tsx';
import { objectFill, zoneFill, type FillStyle } from './style.ts';
import type { ViewBox } from './viewMath.ts';

// ───────── Ground and grid ─────────

export interface GroundProps {
  widthM: number;
  heightM: number;
  color: string;
}

export const Ground = memo(function Ground({ widthM, heightM, color }: GroundProps) {
  return <rect x={0} y={0} width={widthM} height={heightM} fill={color} className="map-ground" />;
});

export interface GridProps {
  view: ViewBox;
  zoom: number;
  widthM: number;
  heightM: number;
  minorM: number;
  majorEvery: number;
}

/** Grid lines inside the visible part of the map, thinned so lines stay ≥ 6 px apart. */
export const Grid = memo(function Grid({ view, zoom, widthM, heightM, minorM, majorEvery }: GridProps) {
  const step = visibleGridStep(minorM, zoom);
  if (step === null) return null;
  const major = step * majorEvery;
  const x0 = Math.max(0, Math.floor(view.x / step) * step);
  const x1 = Math.min(widthM, view.x + view.w);
  const y0 = Math.max(0, Math.floor(view.y / step) * step);
  const y1 = Math.min(heightM, view.y + view.h);
  const top = Math.max(0, view.y);
  const bottom = Math.min(heightM, view.y + view.h);
  const left = Math.max(0, view.x);
  const right = Math.min(widthM, view.x + view.w);
  let minor = '';
  let majorD = '';
  const isMajor = (v: number) => Math.abs(v / major - Math.round(v / major)) < 1e-6;
  for (let x = x0; x <= x1 + 1e-9; x += step) {
    const seg = `M${x} ${top}V${bottom}`;
    if (isMajor(x)) majorD += seg;
    else minor += seg;
  }
  for (let y = y0; y <= y1 + 1e-9; y += step) {
    const seg = `M${left} ${y}H${right}`;
    if (isMajor(y)) majorD += seg;
    else minor += seg;
  }
  return (
    <g aria-hidden="true">
      <path d={minor} className="grid-minor nonscaling" />
      <path d={majorD} className="grid-major nonscaling" />
    </g>
  );
});

// ───────── Shapes with casing and patterns ─────────

interface CasedPathProps {
  d: string;
  style: FillStyle;
  poster: boolean;
  clipId?: string;
}

/** A filled shape with its patterns and the two-tone casing (docs/07 casing rule). */
function CasedPath({ d, style, poster, clipId }: CasedPathProps) {
  const clip = clipId ? `url(#${clipId})` : undefined;
  return (
    <>
      <path d={d} fill={style.fill} className="obj-fill" clipPath={clip} />
      {style.typePattern !== 'none' && (
        <path d={d} fill={patternUrl(style.typePattern, style.ink)} className="pattern-strong" clipPath={clip} />
      )}
      {style.areaPattern !== 'none' && (
        <path d={d} fill={patternUrl(style.areaPattern, style.ink)} className="pattern-subtle" clipPath={clip} />
      )}
      {!poster && <path d={d} className="casing-outer" clipPath={clip} />}
      <path d={d} className="casing-inner" clipPath={clip} />
    </>
  );
}

const shapePath = (shape: Shape): string => polyPath(shapeToPoly(shape));

// ───────── Icons, silhouettes, badges ─────────

export function SvgIcon({ id, x, y, size, color }: { id: IconId; x: number; y: number; size: number; color: string }) {
  const def = ICONS[id];
  const k = size / 24;
  const stroke = 'stroke' in def && def.stroke;
  return (
    <path
      d={def.d}
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${k})`}
      fill={stroke ? 'none' : color}
      stroke={stroke ? color : undefined}
      strokeWidth={stroke ? 2 : undefined}
      fillRule="evenodd"
    />
  );
}

const SILHOUETTE: Record<string, IconId> = {
  Herbivores: 'sil-herbivore',
  Predators: 'sil-predator',
  Primates: 'sil-primate',
  Birds: 'sil-bird',
  Reptiles: 'sil-reptile',
  Amphibians: 'sil-amphibian',
  Fish: 'sil-fish',
  Invertebrates: 'sil-invertebrate',
  Other: 'paw',
};

export function silhouetteFor(a: AnimalEntry): IconId {
  const cat = a.catalogId ? getSpecies(a.catalogId)?.category : undefined;
  return cat ? (SILHOUETTE[cat] ?? 'paw') : 'paw';
}

/** "♂1 ♀5" badge text. The accessible name says "1 male, 5 females" elsewhere. */
export const badgeText = (a: AnimalEntry): string =>
  `♂${a.males} ♀${a.females}${a.juveniles > 0 ? ` +${a.juveniles}` : ''}`;

// ───────── Objects ─────────

export interface ObjectViewProps {
  o: MapObject;
  plan: Plan;
  zoom: number;
  units: Units;
  showAreas: boolean;
  poster: boolean;
  phaseOut: boolean;
  label: string;
}

/** One object. Memoised on its identity, so editing one object re-renders only that one. */
export const ObjectView = memo(function ObjectView({ o, plan, zoom, units, showAreas, poster, phaseOut, label }: ObjectViewProps) {
  const px = 1 / zoom;
  const common = {
    'data-id': o.id,
    'data-hidden': o.hidden ? 'true' : undefined,
    'data-phase-out': phaseOut ? 'true' : undefined,
    role: 'img',
    'aria-label': label,
    className: `obj obj-${o.type}`,
  };

  if (o.type === 'path') {
    const fp = footprint(o) ?? [];
    const style = objectFill(o, plan) as FillStyle;
    const d = multiPath(fp);
    return (
      <g {...common}>
        <path d={d} fill={style.fill} className="obj-fill" />
        {!poster && <path d={d} className="casing-outer" />}
        {o.type === 'path' && o.pathType === 'elevated' && (
          <path d={d} className="casing-inner" strokeDasharray="6 4" />
        )}
        <path d={linePath(o.line.points)} className="hit-line nonscaling" />
      </g>
    );
  }

  if ('shape' in o) {
    const style = objectFill(o, plan) as FillStyle;
    const poly = shapeToPoly(o.shape);
    const d = polyPath(poly);
    const clipId = `clip-${o.id}`;
    const centroid = ringCentroid(poly.outer);
    const box = boxOf(poly.outer);
    const fontPx = 13;
    const font = fontPx * px;
    const children: ReactNode[] = [];

    if (o.type === 'habitat' && o.zones.length > 0) {
      children.push(
        <clipPath id={clipId} key="clip">
          <path d={d} />
        </clipPath>,
        ...o.zones.map((z) => (
          <g key={z.id} data-zone={z.id} className={`zone zone-${z.kind}`}>
            <CasedPath d={shapePath(z.shape)} style={zoneFill(z.kind)} poster={poster} clipId={clipId} />
          </g>
        )),
      );
    }

    // On-map labels: name and area for habitats (docs/03 §2.2), name for buildings.
    const labelLines: string[] = [];
    if (o.type === 'habitat' && showAreas) labelLines.push(o.name, formatArea(polyArea(poly), units));
    else if (o.type === 'building' || o.type === 'plaza') labelLines.push(o.name);
    const widthPx = (box.maxX - box.minX) * zoom;
    const heightPx = (box.maxY - box.minY) * zoom;
    const longest = Math.max(0, ...labelLines.map((l) => l.length));
    const fits = longest * fontPx * 0.6 < widthPx - 8 && labelLines.length * fontPx * 1.3 < heightPx - 8;

    const animals = o.type === 'habitat' ? o.animals.slice(0, 3) : [];
    const silPx = 22;
    const showAnimals = animals.length > 0 && widthPx > 60 && heightPx > (fits ? labelLines.length * 17 + 30 : 30);

    return (
      <g {...common}>
        <CasedPath d={d} style={style} poster={poster} />
        {children}
        {fits && labelLines.length > 0 && (
          <text
            className="obj-label"
            x={centroid.x}
            y={centroid.y - ((labelLines.length - 1) * font * 1.25) / 2 - (showAnimals ? font : 0)}
            fontSize={font}
            fill={style.ink}
            textAnchor="middle"
            dominantBaseline="middle"
            aria-hidden="true"
          >
            {labelLines.map((line, i) => (
              <tspan key={i} x={centroid.x} dy={i === 0 ? 0 : font * 1.25}>
                {line}
              </tspan>
            ))}
          </text>
        )}
        {showAnimals && (
          <g aria-hidden="true">
            {animals.map((a, i) => {
              const cx = centroid.x + (i - (animals.length - 1) / 2) * 70 * px;
              const cy = centroid.y + (fits ? labelLines.length * font * 0.75 + 4 * px : 0) + silPx * px * 0.5;
              return (
                <g key={a.id}>
                  <SvgIcon id={silhouetteFor(a)} x={cx} y={cy} size={silPx * px} color={style.ink} />
                  <text
                    className="obj-label"
                    x={cx}
                    y={cy + silPx * px * 0.9}
                    fontSize={11 * px}
                    fill={style.ink}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                  >
                    {badgeText(a)}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        {o.type === 'building' && (() => {
          const iconId = buildingIcon(o.buildingType);
          if (!iconId || widthPx < 28 || heightPx < 28) return null;
          const s = Math.min(28, widthPx * 0.5, heightPx * 0.5) * px;
          return <SvgIcon id={iconId} x={centroid.x} y={centroid.y + (fits ? font * 1.4 : 0)} size={s} color={style.ink} />;
        })()}
      </g>
    );
  }

  if (o.type === 'barrier') {
    const d = linePath(o.line.points);
    return (
      <g {...common}>
        <path d={d} className="barrier-halo nonscaling" />
        <path d={d} className="barrier-line nonscaling" />
        <path d={d} className="hit-line nonscaling" />
      </g>
    );
  }

  if (o.type === 'icon') {
    const sizeM = o.sizing === 'map' ? o.sizeM : 26 * px;
    const id: IconId = isIconId(o.iconId) ? o.iconId : 'info';
    return (
      <g {...common} transform={o.rotationDeg ? `rotate(${o.rotationDeg} ${o.at.x} ${o.at.y})` : undefined}>
        <rect
          x={o.at.x - sizeM / 2}
          y={o.at.y - sizeM / 2}
          width={sizeM}
          height={sizeM}
          rx={sizeM * 0.18}
          fill="#FFFFFF"
          className="icon-plate"
          stroke="#13201A"
          strokeWidth={1.5 * px}
        />
        <SvgIcon id={id} x={o.at.x} y={o.at.y} size={sizeM * 0.78} color="#13201A" />
      </g>
    );
  }

  if (o.type === 'label') {
    const size = o.sizing === 'map' ? o.size : o.size * px;
    return (
      <g {...common}>
        <text
          className="obj-label free-label"
          x={o.at.x}
          y={o.at.y}
          fontSize={size}
          fill="#13201A"
          stroke="#FFFFFF"
          strokeWidth={3 * px}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={o.rotationDeg ? `rotate(${o.rotationDeg} ${o.at.x} ${o.at.y})` : undefined}
        >
          {o.text}
        </text>
        <rect
          x={o.at.x - (o.text.length * size * 0.3)}
          y={o.at.y - size * 0.6}
          width={o.text.length * size * 0.6}
          height={size * 1.2}
          fill="transparent"
        />
      </g>
    );
  }

  // Measurement
  const pts = o.points;
  const d = o.mode === 'area' ? `${linePath(pts)}Z` : linePath(pts);
  const last = pts.at(-1) ?? { x: 0, y: 0 };
  return (
    <g {...common}>
      <path d={d} className="measure-halo nonscaling" />
      <path d={d} className="measure-line nonscaling" />
      <path d={d} className="hit-line nonscaling" />
      <text
        className="obj-label"
        x={last.x + 8 * px}
        y={last.y - 8 * px}
        fontSize={13 * px}
        fill="#0033CC"
        stroke="#FFFFFF"
        strokeWidth={3 * px}
      >
        {o.mode === 'area' ? formatArea(Math.abs(signedArea(pts)), units) : formatLength(polylineLength(pts), units)}
      </text>
    </g>
  );
});

function buildingIcon(type: string): IconId | null {
  const map: Record<string, IconId> = {
    'animal-house': 'building-animal-house',
    'guest-building': 'person',
    shop: 'gift',
    food: 'food',
    drinks: 'drink',
    restrooms: 'restroom',
    information: 'info',
    staff: 'staff',
    research: 'research',
    vet: 'vet',
    entrance: 'entrance',
    'transport-station': 'transport',
  };
  return map[type] ?? null;
}

function boxOf(points: readonly Vec2[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

// ───────── Selection ─────────

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

export interface SelectionProps {
  objects: MapObject[];
  zoom: number;
  /** Show resize/rotate handles (single, unlocked selection). */
  handles: boolean;
  box: BBox | null;
  vertexEdit: { points: Vec2[]; index: number } | null;
}

export function SelectionLayer({ objects, zoom, handles, box, vertexEdit }: SelectionProps) {
  const px = 1 / zoom;
  const outline = (o: MapObject): string => {
    if ('shape' in o) return shapePath(o.shape);
    if (o.type === 'path') return multiPath(footprint(o) ?? []);
    if ('line' in o) return linePath(o.line.points);
    if (o.type === 'measure') return linePath(o.points);
    const s = (o.type === 'icon' && o.sizing === 'map' ? o.sizeM : 30 * px) / 2;
    return `M${o.at.x - s} ${o.at.y - s}h${2 * s}v${2 * s}h${-2 * s}Z`;
  };
  const hs = 10 * px;
  const hit = 24 * px;
  return (
    <g aria-hidden="true" className="selection-layer">
      {objects.map((o) => (
        <g key={o.id}>
          <path d={outline(o)} className="sel-halo nonscaling" />
          <path d={outline(o)} className="sel-ants nonscaling" />
        </g>
      ))}
      {handles &&
        box &&
        !vertexEdit &&
        handlePositions(box, px).map(({ id, x, y }) => (
          <g key={id} data-handle={id}>
            {id === 'rotate' && (
              <path d={`M${(box.minX + box.maxX) / 2} ${box.minY}V${y}`} className="sel-ants nonscaling" />
            )}
            {id === 'rotate' ? (
              <circle cx={x} cy={y} r={hs / 1.6} className="handle nonscaling" />
            ) : (
              <rect x={x - hs / 2} y={y - hs / 2} width={hs} height={hs} className="handle nonscaling" />
            )}
            <rect x={x - hit / 2} y={y - hit / 2} width={hit} height={hit} className="handle-hit" />
          </g>
        ))}
      {vertexEdit &&
        vertexEdit.points.map((p, i) => (
          <g key={i} data-vertex={i}>
            <rect
              x={p.x - hs / 2}
              y={p.y - hs / 2}
              width={hs}
              height={hs}
              className={i === vertexEdit.index ? 'handle active nonscaling' : 'handle nonscaling'}
            />
            <rect x={p.x - hit / 2} y={p.y - hit / 2} width={hit} height={hit} className="handle-hit" />
          </g>
        ))}
    </g>
  );
}

export function handlePositions(box: BBox, px: number): { id: HandleId; x: number; y: number }[] {
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return [
    { id: 'nw', x: box.minX, y: box.minY },
    { id: 'n', x: cx, y: box.minY },
    { id: 'ne', x: box.maxX, y: box.minY },
    { id: 'e', x: box.maxX, y: cy },
    { id: 'se', x: box.maxX, y: box.maxY },
    { id: 's', x: cx, y: box.maxY },
    { id: 'sw', x: box.minX, y: box.maxY },
    { id: 'w', x: box.minX, y: cy },
    { id: 'rotate', x: cx, y: box.minY - 30 * px },
  ];
}

/** Editable points of an object in vertex mode (polygons, lines, measures). */
export function editablePoints(o: MapObject, zoneId: string | null): Vec2[] | null {
  if (o.type === 'habitat' && zoneId) {
    const z = o.zones.find((x) => x.id === zoneId);
    return z && z.shape.kind === 'polygon' ? z.shape.points : null;
  }
  if ('shape' in o) return o.shape.kind === 'polygon' ? o.shape.points : null;
  if ('line' in o) return o.line.points;
  if (o.type === 'measure') return o.points;
  return null;
}

export const vertexTargets = (shape: Shape): Vec2[] => shapeVertices(shape);

// ───────── Drawing preview ─────────

export interface DraftLayerProps {
  zoom: number;
  points: Vec2[];
  placedCount: number;
  shape: Shape | null;
  kind: 'shape' | 'line' | 'point';
  issueEdges: [number, number] | null;
  lineWidthM: number | null;
}

export function DraftLayer({ zoom, points, placedCount, shape, kind, issueEdges, lineWidthM }: DraftLayerProps) {
  const px = 1 / zoom;
  const d = shape ? shapePath(shape) : linePath(points);
  return (
    <g aria-hidden="true" className="draft-layer">
      {shape && <path d={d} className="draft-fill" />}
      {kind === 'line' && lineWidthM && points.length >= 2 && (
        <path
          d={linePath(points)}
          stroke="#E8ECED"
          strokeOpacity={0.8}
          strokeWidth={lineWidthM}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      <path d={shape && shape.kind !== 'polygon' ? d : linePath(points)} className="draft-line-halo nonscaling" />
      <path d={shape && shape.kind !== 'polygon' ? d : linePath(points)} className="draft-line nonscaling" />
      {issueEdges &&
        issueEdges.map((i) => {
          const a = points[i];
          const b = points[(i + 1) % Math.max(1, placedCount)];
          return a && b ? <path key={i} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} className="draft-issue nonscaling" /> : null;
        })}
      {points.slice(0, placedCount).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4 * px} className="draft-point nonscaling" />
      ))}
    </g>
  );
}

export function Crosshair({ at, zoom }: { at: Vec2; zoom: number }) {
  const px = 1 / zoom;
  const r = 14 * px;
  const gap = 4 * px;
  const d = `M${at.x - r} ${at.y}H${at.x - gap}M${at.x + gap} ${at.y}H${at.x + r}M${at.x} ${at.y - r}V${at.y - gap}M${at.x} ${at.y + gap}V${at.y + r}`;
  return (
    <g aria-hidden="true" className="crosshair">
      <path d={d} className="crosshair-halo nonscaling" />
      <path d={d} className="crosshair-line nonscaling" />
      <circle cx={at.x} cy={at.y} r={2 * px} fill="#13201A" />
    </g>
  );
}

export { bestInk };
