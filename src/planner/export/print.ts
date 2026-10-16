/**
 * Printing (docs/03 §5, docs/06 "Print"): the exported SVG is shown as an image in a print-only
 * container (with the title as real text), then the browser's print dialog opens. The legend is
 * part of the SVG as text; the text summary export is the accessible equivalent.
 */
import type { Plan } from '../../model/types.ts';
import { buildSvg, type SvgExportOptions } from './svg.ts';

export async function printPlan(plan: Plan, options: SvgExportOptions): Promise<void> {
  const exp = buildSvg(plan, options);
  const url = URL.createObjectURL(new Blob([exp.svg], { type: 'image/svg+xml' }));
  const root = document.createElement('div');
  root.className = 'print-root';
  const title = document.createElement('h1');
  title.textContent = plan.name;
  const img = document.createElement('img');
  img.alt = plan.name;
  img.src = url;
  root.append(title, img);
  document.body.append(root);
  try {
    await img.decode();
  } catch {
    // Print anyway; the browser will lay out what it has.
  }
  const cleanup = () => {
    root.remove();
    URL.revokeObjectURL(url);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
