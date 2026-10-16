import { useId, useRef, useState } from 'react';
import { en } from '../../i18n/en.ts';
import { newId } from '../../model/factory.ts';
import { announce } from '../a11y/announcer.ts';
import { deleteAsset, saveAsset } from '../persistence/db.ts';
import { commit } from '../store/history.ts';
import { getState, setState, usePlanner } from '../store/store.ts';
import { CheckField, NumberField, TextField } from '../ui/fields.tsx';
import { Dialog } from '../ui/Dialog.tsx';
import { DialogSection } from './SizeDialogs.tsx';

const t = en.planner.tracing;
const MAX_BYTES = 25 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Tracing underlay (docs/03 §3.11): the user's own screenshot under the map. It's decoded and
 * stored locally only, never uploaded and never put in share links.
 */
export function TracingDialog() {
  const plan = usePlanner((s) => s.plan);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cal, setCal] = useState({ ax: 0, ay: 0, bx: 100, by: 0, dist: 50, x: 0, y: 0 });
  const fileId = useId();
  if (!plan) return null;
  const tracing = plan.tracing;

  const choose = async (file: File | undefined) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError(t.wrongType);
    if (file.size > MAX_BYTES) return setError(t.tooBig);
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return setError(t.unreadable);
    }
    setError(null);
    const assetId = newId();
    await saveAsset(assetId, file);
    const { mapWidthM: w, mapHeightM: h } = plan.settings;
    const old = plan.tracing?.assetId;
    commit(en.planner.history.tracing, (d) => {
      d.tracing = {
        assetId,
        opacity: 0.5,
        locked: true,
        hidden: false,
        widthPx: bitmap.width,
        heightPx: bitmap.height,
        transform: { a: w / bitmap.width, b: 0, c: 0, d: h / bitmap.height, e: 0, f: 0 },
      };
    });
    bitmap.close();
    if (old) await deleteAsset(old);
    const prev = getState().tracingUrl;
    if (prev) URL.revokeObjectURL(prev);
    setState({ tracingUrl: URL.createObjectURL(file) });
    announce(t.loaded);
  };

  const update = (patch: Partial<NonNullable<typeof tracing>>) =>
    commit(en.planner.history.tracing, (d) => {
      if (d.tracing) Object.assign(d.tracing, patch);
    });

  const remove = async () => {
    if (!tracing) return;
    await deleteAsset(tracing.assetId);
    commit(en.planner.history.tracing, (d) => {
      delete d.tracing;
    });
    const url = getState().tracingUrl;
    if (url) URL.revokeObjectURL(url);
    setState({ tracingUrl: null });
  };

  const scale = tracing ? Math.hypot(tracing.transform.a, tracing.transform.b) : 0;

  return (
    <Dialog
      title={t.title}
      onClose={() => setState({ dialog: null })}
      cancelLabel={en.planner.dialogs.done}
      wide
    >
      <p>{t.intro}</p>
      <div className="field">
        <label htmlFor={fileId}>{tracing ? t.replace : t.choose}</label>
        <input
          id={fileId}
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fileId}-err` : undefined}
          onChange={(e) => void choose(e.target.files?.[0])}
        />
        {error && (
          <span id={`${fileId}-err`} className="field-error">
            {error}
          </span>
        )}
      </div>
      {tracing && (
        <>
          <p>{t.scaleNow(scale.toFixed(4))}</p>
          <div className="field-row">
            <NumberField
              label={t.opacity}
              value={Math.round(tracing.opacity * 100)}
              min={0}
              max={100}
              digits={0}
              step={5}
              onCommit={(v) => update({ opacity: v / 100 })}
            />
            <TextField
              label={t.description}
              value={tracing.description ?? ''}
              maxLength={120}
              onCommit={(v) => update({ description: v })}
            />
          </div>
          <div className="field-row">
            <CheckField
              label={t.locked}
              checked={tracing.locked}
              onChange={(v) => update({ locked: v })}
            />
            <CheckField
              label={t.hidden}
              checked={tracing.hidden}
              onChange={(v) => update({ hidden: v })}
            />
          </div>
          <DialogSection title={t.calibrate}>
            <p className="field-help">{t.pickHint}</p>
            <div className="field-row field-row-3">
              <NumberField
                label={t.ax}
                value={cal.ax}
                digits={0}
                onCommit={(v) => setCal({ ...cal, ax: v })}
              />
              <NumberField
                label={t.ay}
                value={cal.ay}
                digits={0}
                onCommit={(v) => setCal({ ...cal, ay: v })}
              />
              <NumberField
                label={t.bx}
                value={cal.bx}
                digits={0}
                onCommit={(v) => setCal({ ...cal, bx: v })}
              />
              <NumberField
                label={t.by}
                value={cal.by}
                digits={0}
                onCommit={(v) => setCal({ ...cal, by: v })}
              />
              <NumberField
                label={t.distance}
                value={cal.dist}
                min={0.01}
                onCommit={(v) => setCal({ ...cal, dist: v })}
              />
              <NumberField
                label={t.mapX}
                value={cal.x}
                onCommit={(v) => setCal({ ...cal, x: v })}
              />
              <NumberField
                label={t.mapY}
                value={cal.y}
                onCommit={(v) => setCal({ ...cal, y: v })}
              />
            </div>
            <div className="inline-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const px = Math.hypot(cal.bx - cal.ax, cal.by - cal.ay);
                  if (px <= 0) return;
                  const s = cal.dist / px;
                  update({ transform: { a: s, b: 0, c: 0, d: s, e: cal.x, f: cal.y } });
                  announce(t.scaleNow(s.toFixed(4)));
                }}
              >
                {t.apply}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  update({
                    transform: {
                      a: plan.settings.mapWidthM / tracing.widthPx,
                      b: 0,
                      c: 0,
                      d: plan.settings.mapHeightM / tracing.heightPx,
                      e: 0,
                      f: 0,
                    },
                  })
                }
              >
                {t.fill}
              </button>
            </div>
          </DialogSection>
          <button type="button" className="btn btn-danger" onClick={() => void remove()}>
            {t.remove}
          </button>
        </>
      )}
    </Dialog>
  );
}
