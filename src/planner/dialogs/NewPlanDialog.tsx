import { useId, useState } from 'react';
import { en } from '../../i18n/en.ts';
import { DEFAULT_BIOME, DEFAULT_PRESET, MAP_BIOMES, MAPS } from '../../data/index.ts';
import { formatNumber } from '../../lib/format.ts';
import { createPlan } from '../../model/factory.ts';
import type { PlanMode } from '../../model/types.ts';
import { announce } from '../a11y/announcer.ts';
import { loadPlan } from '../store/history.ts';
import { getState, setState } from '../store/store.ts';
import { fitMap } from '../store/view.ts';
import { savePlan } from '../persistence/db.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { Icon } from '../ui/Icon.tsx';

const t = en.planner.newPlan;

/** New plan (docs/03 §2.6): zoo name, mode, biome (swatch and name), map preset. */
export function NewPlanDialog({ firstRun }: { firstRun?: boolean }) {
  const current = getState().plan;
  const [name, setName] = useState(firstRun ? (current?.name ?? t.defaultName) : t.defaultName);
  const [mode, setMode] = useState<PlanMode>(
    current && firstRun ? current.settings.mode : 'sandbox',
  );
  const [biomeId, setBiomeId] = useState(
    current && firstRun ? current.settings.biomeId : DEFAULT_BIOME.id,
  );
  const [presetId, setPresetId] = useState(DEFAULT_PRESET.id);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();

  const close = () => setState({ dialog: null });
  const submit = () => {
    if (!name.trim()) {
      setError(en.planner.dialogs.required(t.name));
      return;
    }
    const plan = createPlan({ name, mode, biomeId, presetId });
    // On first run, replace the untouched starter plan rather than adding a second one.
    if (firstRun && current && getState().past.length === 0) plan.id = current.id;
    loadPlan(plan);
    void savePlan(plan);
    setState({ dialog: null, prefs: { ...getState().prefs, lastPlanId: plan.id } });
    requestAnimationFrame(fitMap);
    announce(t.created(plan.name));
  };

  const preset = MAPS.presets.find((p) => p.id === presetId) ?? DEFAULT_PRESET;
  return (
    <Dialog
      title={t.title}
      onClose={close}
      onSubmit={submit}
      actions={
        <button type="submit" className="btn btn-primary">
          {t.create}
        </button>
      }
      description={firstRun ? t.welcome : undefined}
    >
      <div className="field">
        <label htmlFor={nameId}>{t.name}</label>
        <input
          id={nameId}
          type="text"
          value={name}
          maxLength={60}
          required
          data-autofocus
          aria-invalid={error ? true : undefined}
          aria-describedby={`${nameId}-help${error ? ` ${nameId}-err` : ''}`}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        <span id={`${nameId}-help`} className="field-help">
          {t.nameHelp}
        </span>
        {error && (
          <span id={`${nameId}-err`} className="field-error">
            <Icon id="error" size={16} />
            {error}
          </span>
        )}
      </div>

      <fieldset>
        <legend>{t.mode}</legend>
        <div className="radio-row">
          {(['sandbox', 'franchise'] as const).map((m) => (
            <label key={m} className="check-row">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
              />
              {m === 'sandbox' ? t.sandbox : t.franchise}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t.biome}</legend>
        <div className="choice-grid">
          {MAP_BIOMES.map((b) => (
            <label key={b.id} className="choice-card">
              <input
                type="radio"
                name="biome"
                value={b.id}
                checked={biomeId === b.id}
                onChange={() => setBiomeId(b.id)}
              />
              <span className="swatch" aria-hidden="true" style={{ background: b.ground }} />
              <span>
                {b.label}
                {b.type !== 'land' && <span className="field-help"> {t.unverifiedBiome}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {MAPS.presets.length > 1 ? (
        <fieldset>
          <legend>{t.preset}</legend>
          {MAPS.presets.map((p) => (
            <label key={p.id} className="check-row">
              <input
                type="radio"
                name="preset"
                checked={presetId === p.id}
                onChange={() => setPresetId(p.id)}
              />
              {t.presetLabel(p.label, `${formatNumber(p.widthM)} × ${formatNumber(p.heightM)} m`)}
            </label>
          ))}
        </fieldset>
      ) : (
        <p>
          {t.presetLabel(
            preset.label,
            `${formatNumber(preset.widthM)} × ${formatNumber(preset.heightM)} m`,
          )}
        </p>
      )}
      {!preset.verified && <p className="notice">{t.unverifiedSize}</p>}
    </Dialog>
  );
}
