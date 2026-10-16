/**
 * Text summary export (docs/03 §5): every area, habitat, size and species as HTML, CSV or
 * Markdown. This is the accessible equivalent of the poster (docs/08 EN 301 549 clause 10).
 */
import { SITE_NAME } from '../../config/site.ts';
import { en } from '../../i18n/en.ts';
import { formatArea, formatLength, formatPercent } from '../../lib/format.ts';
import { checkHabitat } from '../../model/requirements.ts';
import { habitatMeasure, objectArea, objectLength, planTotals } from '../../model/totals.ts';
import type { HabitatObject, Plan } from '../../model/types.ts';
import { animalName, sexCounts, typeLabel } from '../describe.ts';
import { escapeXml } from './svg.ts';

export type SummaryFormat = 'html' | 'csv' | 'markdown';

interface Row {
  area: string;
  name: string;
  type: string;
  size: string;
  land: string;
  water: string;
  animals: string;
  status: string;
}

function rows(plan: Plan): Row[] {
  const units = plan.settings.units;
  const mapM2 = plan.settings.mapWidthM * plan.settings.mapHeightM;
  return plan.objects.map((o) => {
    const area = plan.areas.find((a) => a.id === o.areaId)?.name ?? en.planner.objects.unassigned;
    if (o.type === 'habitat') {
      const m = habitatMeasure(o, mapM2);
      const c = checkHabitat(o, m, plan.speciesLibrary, plan.settings.requirementBufferPct);
      return {
        area,
        name: o.name,
        type: typeLabel(o),
        size: formatArea(m.totalM2, units),
        land: formatArea(m.landM2, units),
        water: formatArea(m.waterM2, units),
        animals: (o as HabitatObject).animals
          .map((a) => `${animalName(a)} (${sexCounts(a)})`)
          .join('; '),
        status:
          c.status === 'fits'
            ? en.planner.inspector.requirementFits
            : c.status === 'short'
              ? en.planner.inspector.requirementShort(formatArea(c.shortM2, units))
              : c.status === 'noData'
                ? en.planner.inspector.requirementNoData
                : en.planner.inspector.noAnimals,
      };
    }
    const a = o.type === 'path' ? null : objectArea(o);
    const l = objectLength(o);
    return {
      area,
      name: o.name,
      type: typeLabel(o),
      size: a !== null ? formatArea(a, units) : l !== null ? formatLength(l, units) : '',
      land: '',
      water: '',
      animals: '',
      status: '',
    };
  });
}

const HEAD = ['Area', 'Name', 'Type', 'Size', 'Land', 'Water', 'Animals', 'Space check'];

const csvCell = (v: string): string => {
  // Defuse spreadsheet formulas (CSV injection) and quote everything.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

const mdCell = (v: string): string => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function buildSummary(
  plan: Plan,
  format: SummaryFormat,
): { text: string; mime: string; ext: string } {
  const r = rows(plan);
  const units = plan.settings.units;
  const totals = planTotals(plan);
  const cells = (x: Row) => [x.area, x.name, x.type, x.size, x.land, x.water, x.animals, x.status];
  if (format === 'csv') {
    const text = [HEAD, ...r.map(cells)].map((line) => line.map(csvCell).join(',')).join('\r\n');
    return { text, mime: 'text/csv', ext: 'csv' };
  }
  const intro = `${formatArea(totals.plannedM2, units)} planned of ${formatArea(totals.mapM2, units)} (${formatPercent(totals.plannedM2 / totals.mapM2)}).`;
  if (format === 'markdown') {
    const text = [
      `# ${mdCell(plan.name)}`,
      plan.subtitle ? `\n${mdCell(plan.subtitle)}\n` : '',
      intro,
      '',
      `| ${HEAD.join(' | ')} |`,
      `| ${HEAD.map(() => '---').join(' | ')} |`,
      ...r.map((x) => `| ${cells(x).map(mdCell).join(' | ')} |`),
      '',
      `Made with ${SITE_NAME}.`,
    ].join('\n');
    return { text, mime: 'text/markdown', ext: 'md' };
  }
  const esc = escapeXml;
  const text = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(plan.name)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:70rem;margin:2rem auto;padding:0 1rem;line-height:1.5}table{border-collapse:collapse;width:100%}th,td{border:1px solid #7c8a80;padding:.4rem .6rem;text-align:left;vertical-align:top}thead th{background:#e3ebdc}</style></head>
<body><main><h1>${esc(plan.name)}</h1>${plan.subtitle ? `<p>${esc(plan.subtitle)}</p>` : ''}<p>${esc(intro)}</p>
<table><caption>Everything in the plan, with sizes and animals</caption><thead><tr>${HEAD.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${r
    .map(
      (x) =>
        `<tr><td>${esc(x.area)}</td><th scope="row">${esc(x.name)}</th>${cells(x)
          .slice(2)
          .map((c) => `<td>${esc(c)}</td>`)
          .join('')}</tr>`,
    )
    .join('')}</tbody></table>
<p>Made with ${esc(SITE_NAME)}, an unofficial fan-made planning tool for Planet Zoo 2.</p></main></body></html>`;
  return { text, mime: 'text/html', ext: 'html' };
}
