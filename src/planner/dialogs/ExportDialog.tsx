import { useId, useMemo, useState } from 'react';
import { en } from '../../i18n/en.ts';
import { announce } from '../a11y/announcer.ts';
import { downloadBlob, fileSlug, savePlanFile, shareLink } from '../persistence/file.ts';
import { buildSvg, svgToPng, type ExportArea } from '../export/svg.ts';
import { buildSummary, type SummaryFormat } from '../export/summary.ts';
import { printPlan } from '../export/print.ts';
import { getState, setState, usePlanner } from '../store/store.ts';
import { viewBox } from '../map/viewMath.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { DialogSection } from './SizeDialogs.tsx';
import { Icon } from '../ui/Icon.tsx';

const t = en.planner.export;

/** Export and share (docs/03 §5): plan file, share link, PNG/SVG, print, text summary. */
export function ExportDialog() {
  const plan = usePlanner((s) => s.plan);
  const selection = usePlanner((s) => s.selection);
  const [area, setArea] = useState<ExportArea>('map');
  const [scale, setScale] = useState(2);
  const [legend, setLegend] = useState(true);
  const [format, setFormat] = useState<SummaryFormat>('html');
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const linkId = useId();
  const link = useMemo(
    () => (plan ? shareLink(plan, location.href.split('#')[0] ?? location.href) : ''),
    [plan],
  );
  if (!plan) return null;
  const slug = fileSlug(plan.name);
  const svgOptions = () => {
    const v = getState().view;
    const vb = viewBox(v);
    return {
      area,
      legend,
      viewBox: { minX: vb.x, minY: vb.y, maxX: vb.x + vb.w, maxY: vb.y + vb.h },
      selection,
    };
  };

  const done = (name: string) => announce(t.done(name));

  return (
    <Dialog
      title={t.title}
      onClose={() => setState({ dialog: null })}
      cancelLabel={en.planner.dialogs.close}
      wide
    >
      <DialogSection title={t.saveFile}>
        <p className="field-help">{t.saveFileHelp}</p>
        <button
          type="button"
          className="btn btn-primary"
          data-autofocus
          onClick={() => done(savePlanFile(plan))}
        >
          <Icon id="download" />
          {t.saveFile}
        </button>
      </DialogSection>

      <DialogSection title={t.share}>
        <p className="field-help">{t.shareHelp}</p>
        {link.length > 8000 && (
          <p className="notice">
            {t.shareTooLong(new Intl.NumberFormat('en-US').format(link.length))}
          </p>
        )}
        <div className="field">
          <label htmlFor={linkId}>{t.linkLabel}</label>
          <textarea
            id={linkId}
            readOnly
            rows={3}
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(t.copied);
              announce(t.copied);
            } catch {
              setCopied(t.copyFailed);
              announce(t.copyFailed);
            }
          }}
        >
          <Icon id="copy" />
          {t.copy}
        </button>
        {copied && <p className="field-help">{copied}</p>}
      </DialogSection>

      <DialogSection title={`${t.png} / ${t.svg}`}>
        <fieldset>
          <legend>{t.area}</legend>
          <div className="radio-row">
            {(['map', 'view', 'selection'] as const).map((a) => (
              <label key={a} className="check-row">
                <input
                  type="radio"
                  name="area"
                  checked={area === a}
                  disabled={a === 'selection' && selection.length === 0}
                  onChange={() => setArea(a)}
                />
                {a === 'map' ? t.areaMap : a === 'view' ? t.areaView : t.areaSelection}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t.scale}</legend>
          <div className="radio-row">
            {[1, 2, 4].map((s) => (
              <label key={s} className="check-row">
                <input
                  type="radio"
                  name="scale"
                  checked={scale === s}
                  onChange={() => setScale(s)}
                />
                {s === 1 ? t.scale1 : s === 2 ? t.scale2 : t.scale4}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="check-row">
          <input type="checkbox" checked={legend} onChange={(e) => setLegend(e.target.checked)} />
          {t.legend}
        </label>
        <div className="inline-actions">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const exp = buildSvg(plan, svgOptions());
                const { blob, capped } = await svgToPng(exp, scale);
                downloadBlob(blob, `${slug}.png`);
                done(`${slug}.png`);
                if (capped) announce(t.tooLarge);
              } catch {
                announce(t.error, { assertive: true });
              } finally {
                setBusy(false);
              }
            }}
          >
            <Icon id="image" />
            {t.download} {t.png}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const exp = buildSvg(plan, svgOptions());
              downloadBlob(new Blob([exp.svg], { type: 'image/svg+xml' }), `${slug}.svg`);
              done(`${slug}.svg`);
            }}
          >
            <Icon id="image" />
            {t.download} {t.svg}
          </button>
          <button type="button" className="btn" onClick={() => void printPlan(plan, svgOptions())}>
            <Icon id="print" />
            {t.printButton}
          </button>
        </div>
      </DialogSection>

      <DialogSection title={t.summary}>
        <p className="field-help">{t.summaryHelp}</p>
        <fieldset>
          <legend>{t.format}</legend>
          <div className="radio-row">
            {(['html', 'csv', 'markdown'] as const).map((f) => (
              <label key={f} className="check-row">
                <input
                  type="radio"
                  name="format"
                  checked={format === f}
                  onChange={() => setFormat(f)}
                />
                {f === 'html' ? t.html : f === 'csv' ? t.csv : t.markdown}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const s = buildSummary(plan, format);
            const name = `${slug}-summary.${s.ext}`;
            downloadBlob(new Blob([s.text], { type: s.mime }), name);
            done(name);
          }}
        >
          <Icon id="download" />
          {t.download} {t.summary}
        </button>
      </DialogSection>
    </Dialog>
  );
}
