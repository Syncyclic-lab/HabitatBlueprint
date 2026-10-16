/**
 * SVG export (docs/06 "Export"): a clean copy of the map with a <title>, <desc>, title block and
 * legend as real text. Built as a string with every piece of user text escaped (docs/09), so a
 * zoo called <script> stays text.
 */
import { SITE_NAME } from '../../config/site.ts';
import { getSwatch } from '../../data/index.ts';
import { ICONS, isIconId, type IconId } from '../../assets/icons/icons.ts';
import type { BBox, Vec2 } from '../../geometry/types.ts';
import { shapeToPoly } from '../../geometry/flatten.ts';
import { polyArea, ringCentroid } from '../../geometry/polygon.ts';
import { scaleBar } from '../../geometry/scale.ts';
import { en } from '../../i18n/en.ts';
import { formatArea, formatLength } from '../../lib/format.ts';
import { objectsBBox } from '../../model/objectGeometry.ts';
import { footprint } from '../../model/totals.ts';
import type { MapObject, Plan } from '../../model/types.ts';
import { linePath, multiPath, polyPath } from '../map/paths.ts';
import { groundColor, LAYER_RANK, objectFill, zoneFill } from '../map/style.ts';
import { badgeText, silhouetteFor } from '../map/layers.tsx';
import { legendData } from '../legend.ts';

export function escapeXml(text: string): string {
  return text.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] as string,
  );
}

export type ExportArea = 'map' | 'view' | 'selection';

export interface SvgExportOptions {
  area: ExportArea;
  legend: boolean;
  /** Visible map box (for area 'view'). */
  viewBox?: BBox;
  selection?: string[];
}

export interface SvgExport {
  svg: string;
  width: number;
  height: number;
}

const MAP_PX = 1600;
const LEGEND_W = 440;
const FONT = "'Atkinson Hyperlegible Next', Arial, sans-serif";

function iconPath(id: IconId, x: number, y: number, size: number, color: string): string {
  const def = ICONS[id];
  const k = size / 24;
  const stroke = 'stroke' in def && def.stroke;
  return `<path d="${def.d}" transform="translate(${x - size / 2} ${y - size / 2}) scale(${k})" ${
    stroke
      ? `fill="none" stroke="${color}" stroke-width="2"`
      : `fill="${color}" fill-rule="evenodd"`
  }/>`;
}

function objectSvg(o: MapObject, plan: Plan, px: number): string {
  const units = plan.settings.units;
  const style = objectFill(o, plan);
  const casing = `<path d="__D__" fill="none" stroke="#13201A" stroke-width="${3.5 * px}" stroke-linejoin="round"/><path d="__D__" fill="none" stroke="#FFF8C9" stroke-width="${px}" stroke-linejoin="round"/>`;
  if (o.type === 'path' && style) {
    const d = multiPath(footprint(o) ?? []);
    return `<g><path d="${d}" fill="${style.fill}"/><path d="${d}" fill="none" stroke="#13201A" stroke-width="${2 * px}"/></g>`;
  }
  if ('shape' in o && style) {
    const poly = shapeToPoly(o.shape);
    const d = polyPath(poly);
    const c = ringCentroid(poly.outer);
    let out = `<g><path d="${d}" fill="${style.fill}"/>`;
    if (o.type === 'habitat') {
      out += `<clipPath id="ex-${escapeXml(o.id)}"><path d="${d}"/></clipPath>`;
      for (const z of o.zones) {
        const zd = polyPath(shapeToPoly(z.shape));
        out += `<path d="${zd}" fill="${zoneFill(z.kind).fill}" clip-path="url(#ex-${escapeXml(o.id)})"/>`;
      }
    }
    out += casing.replaceAll('__D__', d);
    const lines: string[] = [];
    if (o.type === 'habitat' && plan.settings.display.showAreasOnMap)
      lines.push(o.name, formatArea(polyArea(poly), units));
    else if (o.type === 'building' || o.type === 'plaza') lines.push(o.name);
    const fs = 13 * px;
    lines.forEach((line, i) => {
      out += `<text x="${c.x}" y="${c.y + (i - (lines.length - 1) / 2) * fs * 1.25}" font-size="${fs}" font-family="${FONT}" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="${style.ink}">${escapeXml(line)}</text>`;
    });
    if (o.type === 'habitat') {
      o.animals.slice(0, 3).forEach((a, i) => {
        const x = c.x + (i - (Math.min(3, o.animals.length) - 1) / 2) * 70 * px;
        const y = c.y + lines.length * fs * 0.8 + 14 * px;
        out += iconPath(silhouetteFor(a), x, y, 22 * px, style.ink);
        out += `<text x="${x}" y="${y + 20 * px}" font-size="${11 * px}" font-family="${FONT}" text-anchor="middle" fill="${style.ink}">${escapeXml(badgeText(a))}</text>`;
      });
    }
    return `${out}</g>`;
  }
  if (o.type === 'barrier') {
    const d = linePath(o.line.points);
    return `<g><path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${6 * px}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#13201A" stroke-width="${3 * px}" stroke-linecap="round"/></g>`;
  }
  if (o.type === 'icon') {
    const size = o.sizing === 'map' ? o.sizeM : 26 * px;
    const id: IconId = isIconId(o.iconId) ? o.iconId : 'info';
    return `<g><rect x="${o.at.x - size / 2}" y="${o.at.y - size / 2}" width="${size}" height="${size}" rx="${size * 0.18}" fill="#FFFFFF" stroke="#13201A" stroke-width="${1.5 * px}"/>${iconPath(id, o.at.x, o.at.y, size * 0.78, '#13201A')}</g>`;
  }
  if (o.type === 'label') {
    const size = o.sizing === 'map' ? o.size : o.size * px;
    return `<text x="${o.at.x}" y="${o.at.y}" font-size="${size}" font-family="${FONT}" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#13201A" stroke="#FFFFFF" stroke-width="${3 * px}" paint-order="stroke">${escapeXml(o.text)}</text>`;
  }
  if (o.type === 'measure') {
    const d = o.mode === 'area' ? `${linePath(o.points)}Z` : linePath(o.points);
    return `<path d="${d}" fill="none" stroke="#0033CC" stroke-width="${2.5 * px}" stroke-dasharray="${8 * px} ${4 * px}"/>`;
  }
  return '';
}

/** The box to export. */
export function exportBox(plan: Plan, options: SvgExportOptions): BBox {
  const map: BBox = {
    minX: 0,
    minY: 0,
    maxX: plan.settings.mapWidthM,
    maxY: plan.settings.mapHeightM,
  };
  if (options.area === 'view' && options.viewBox) return options.viewBox;
  if (options.area === 'selection' && options.selection?.length) {
    const box = objectsBBox(plan.objects.filter((o) => options.selection?.includes(o.id)));
    if (box) {
      const pad = Math.max(box.maxX - box.minX, box.maxY - box.minY) * 0.05 + 2;
      return {
        minX: box.minX - pad,
        minY: box.minY - pad,
        maxX: box.maxX + pad,
        maxY: box.maxY + pad,
      };
    }
  }
  return map;
}

export function buildSvg(plan: Plan, options: SvgExportOptions): SvgExport {
  const box = exportBox(plan, options);
  const bw = box.maxX - box.minX;
  const bh = box.maxY - box.minY;
  const k = MAP_PX / Math.max(bw, bh); // px per meter
  const px = 1 / k;
  const mapW = bw * k;
  const mapH = bh * k;
  const legend = options.legend ? legendData(plan) : null;
  const width = Math.round(mapW + (legend ? LEGEND_W : 0));
  const objects = plan.objects
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !o.hidden)
    .sort((a, b) => LAYER_RANK[a.o.type] - LAYER_RANK[b.o.type] || a.i - b.i)
    .map(({ o }) => objectSvg(o, plan, px))
    .join('');

  // Legend column as real text.
  let legendSvg = '';
  let legendH = 0;
  if (legend) {
    let y = 24;
    const x = mapW + 24;
    const line = (text: string, size: number, weight = 400, fill = '#13201A', dx = 0) => {
      legendSvg += `<text x="${x + dx}" y="${y}" font-size="${size}" font-family="${FONT}" font-weight="${weight}" fill="${fill}">${escapeXml(text)}</text>`;
      y += size * 1.35;
    };
    line(plan.name, 30, 800);
    if (plan.subtitle) line(plan.subtitle, 18);
    y += 10;
    for (const block of legend.blocks) {
      const sw = block.swatchId ? getSwatch(block.swatchId) : undefined;
      legendSvg += `<rect x="${x}" y="${y - 20}" width="${LEGEND_W - 48}" height="30" rx="6" fill="${sw?.fill ?? '#DBB34D'}" stroke="#13201A"/>`;
      line(block.name, 18, 700, sw?.ink ?? '#000000', 10);
      y += 4;
      for (const cat of block.categories) {
        line(en.planner.legend.categories[cat.category], 15, 700);
        for (const s of cat.species) {
          legendSvg += iconPath(silhouetteFor(s.animal), x + 12, y - 6, 18, '#13201A');
          line(s.name, 14, 400, '#13201A', 28);
        }
      }
      y += 10;
    }
    if (legend.services.length > 0) {
      legendSvg += `<rect x="${x}" y="${y - 20}" width="${LEGEND_W - 48}" height="30" rx="6" fill="#EF7837" stroke="#13201A"/>`;
      line(en.planner.areas.guestServices, 18, 700, '#000000', 10);
      for (const id of legend.services) {
        legendSvg += iconPath(id, x + 12, y - 6, 18, '#13201A');
        line(en.planner.facilities[id], 14, 400, '#13201A', 28);
      }
    }
    legendH = y + 20;
  }
  const height = Math.round(Math.max(mapH, legendH));

  // Scale bar and north arrow inside the map frame.
  const bar = scaleBar(k, 160);
  const units = plan.settings.units;
  const extras =
    (plan.titleBlock.showScale
      ? `<g transform="translate(16 ${mapH - 40})"><rect width="${bar.px + 24}" height="32" rx="6" fill="#FFFFFF" stroke="#13201A" stroke-width="2"/><path d="M12 22h${bar.px}M12 16v6M${12 + bar.px} 16v6" stroke="#13201A" stroke-width="2" fill="none"/><text x="12" y="13" font-size="12" font-family="${FONT}" font-weight="700" fill="#13201A">${escapeXml(formatLength(bar.meters, units))}</text></g>`
      : '') +
    (plan.titleBlock.showNorth
      ? `<g transform="translate(${mapW - 52} 16)"><rect width="36" height="48" rx="6" fill="#FFFFFF" stroke="#13201A" stroke-width="2"/>${iconPath('north', 18, 20, 22, '#13201A')}<text x="18" y="42" font-size="12" font-family="${FONT}" font-weight="800" text-anchor="middle" fill="#13201A">N</text></g>`
      : '');

  const title = escapeXml(`${plan.name} – ${SITE_NAME}`);
  const desc = escapeXml(
    `Plan of ${plan.name}: ${plan.objects.length} objects on a ${plan.settings.mapWidthM} by ${plan.settings.mapHeightM} meter map. Made with ${SITE_NAME}, an unofficial fan-made planner for Planet Zoo 2.`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d"><title id="t">${title}</title><desc id="d">${desc}</desc><rect width="${width}" height="${height}" fill="#F2F5EE"/><svg x="0" y="0" width="${mapW}" height="${mapH}" viewBox="${box.minX} ${box.minY} ${bw} ${bh}"><rect x="0" y="0" width="${plan.settings.mapWidthM}" height="${plan.settings.mapHeightM}" fill="${groundColor(plan)}"/>${objects}<rect x="0" y="0" width="${plan.settings.mapWidthM}" height="${plan.settings.mapHeightM}" fill="none" stroke="#13201A" stroke-width="${3 * px}"/></svg>${extras}${legendSvg}</svg>`;
  return { svg, width, height };
}

/** Renders the SVG to a PNG at `scale`, capped at 8,192 px on the long edge (docs/03 §5). */
export async function svgToPng(
  exp: SvgExport,
  scale: number,
): Promise<{ blob: Blob; capped: boolean }> {
  const long = Math.max(exp.width, exp.height);
  const s = Math.min(scale, 8192 / long);
  const url = URL.createObjectURL(new Blob([exp.svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(exp.width * s);
    canvas.height = Math.round(exp.height * s);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    );
    return { blob, capped: s < scale };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type Point = Vec2;
