import { useState } from 'react';
import { en } from '../../i18n/en.ts';
import { DEFAULT_PRESET, MAP_BIOMES, MAPS } from '../../data/index.ts';
import { formatNumber } from '../../lib/format.ts';
import { GRID_STEPS_M } from '../../geometry/scale.ts';
import { SHORTCUTS, formatKey, type ShortcutId } from '../a11y/shortcuts.ts';
import { updateSettings } from '../store/actions.ts';
import { getState, setState, usePlanner } from '../store/store.ts';
import { applyTheme } from '../persistence/prefs.ts';
import { CheckField, NumberField, SelectField } from '../ui/fields.tsx';
import { Dialog } from '../ui/Dialog.tsx';

const t = en.planner.settings;

/** Map settings (docs/03 §4.8). Changes apply as you make them; each is one undo step. */
export function MapSettingsDialog() {
  const plan = usePlanner((s) => s.plan);
  const prefs = usePlanner((s) => s.prefs);
  const [remap, setRemap] = useState(false);
  const [clash, setClash] = useState<string | null>(null);
  if (!plan) return null;
  const s = plan.settings;
  const preset = MAPS.presets.find((p) => p.id === s.mapPresetId) ?? DEFAULT_PRESET;
  const sizeChanged = preset.widthM !== s.mapWidthM || preset.heightM !== s.mapHeightM;
  const singles = SHORTCUTS.filter((sc) => sc.single);

  const setPrefs = (patch: Partial<typeof prefs>) =>
    setState({ prefs: { ...getState().prefs, ...patch } });

  const setOverride = (id: ShortcutId, key: string) => {
    const k = key.trim().toLowerCase().slice(0, 1);
    const overrides = { ...prefs.shortcutOverrides };
    if (!k) {
      const rest = Object.fromEntries(Object.entries(overrides).filter(([sid]) => sid !== id));
      setClash(null);
      setPrefs({ shortcutOverrides: rest });
      return;
    }
    const used = singles.some((sc) => sc.id !== id && (overrides[sc.id] ?? sc.keys[0]) === k);
    if (used) {
      setClash(t.remapClash(k.toUpperCase()));
      return;
    }
    setClash(null);
    overrides[id] = k;
    setPrefs({ shortcutOverrides: overrides });
  };

  return (
    <Dialog
      title={t.title}
      onClose={() => setState({ dialog: null })}
      cancelLabel={en.planner.dialogs.done}
      wide
    >
      <fieldset className="settings-group">
        <legend>{t.map}</legend>
        <div className="field-row">
          <SelectField
            label={t.biome}
            value={s.biomeId}
            options={MAP_BIOMES.map((b) => ({ value: b.id, label: b.label }))}
            onChange={(v) => updateSettings((d) => void (d.biomeId = v))}
          />
          <SelectField
            label={t.mode}
            value={s.mode}
            options={[
              { value: 'sandbox', label: en.planner.newPlan.sandbox },
              { value: 'franchise', label: en.planner.newPlan.franchise },
            ]}
            onChange={(v) => updateSettings((d) => void (d.mode = v))}
          />
        </div>
        <p>
          {t.preset}: {formatNumber(s.mapWidthM)} × {formatNumber(s.mapHeightM)} m
        </p>
        {!preset.verified && <p className="notice">{t.unverified}</p>}
        {sizeChanged && (
          <div className="notice">
            <p>
              {t.sizeChanged(
                `${formatNumber(s.mapWidthM)} × ${formatNumber(s.mapHeightM)} m`,
                `${formatNumber(preset.widthM)} × ${formatNumber(preset.heightM)} m`,
              )}
            </p>
            <button
              type="button"
              className="btn btn-small"
              onClick={() =>
                updateSettings((d) => {
                  d.mapWidthM = preset.widthM;
                  d.mapHeightM = preset.heightM;
                })
              }
            >
              {t.updateSize}
            </button>
          </div>
        )}
      </fieldset>

      <fieldset className="settings-group">
        <legend>{t.display}</legend>
        <div className="field-row">
          <SelectField
            label={t.units}
            value={s.units}
            help={t.unitsHelp}
            options={[
              { value: 'metric', label: t.metric },
              { value: 'imperial', label: t.imperial },
            ]}
            onChange={(v) => updateSettings((d) => void (d.units = v))}
          />
          <SelectField
            label={t.theme}
            value={prefs.theme}
            options={[
              { value: 'system', label: t.themeSystem },
              { value: 'light', label: t.themeLight },
              { value: 'dark', label: t.themeDark },
            ]}
            onChange={(v) => {
              setPrefs({ theme: v });
              applyTheme(v);
            }}
          />
          <SelectField
            label={t.style}
            value={s.display.style}
            options={[
              { value: 'clear', label: t.styleClear },
              { value: 'poster', label: t.stylePoster },
            ]}
            onChange={(v) => updateSettings((d) => void (d.display.style = v))}
          />
        </div>
        <CheckField
          label={t.showAreas}
          checked={s.display.showAreasOnMap}
          onChange={(v) => updateSettings((d) => void (d.display.showAreasOnMap = v))}
        />
        <CheckField
          label={t.patterns}
          help={t.patternsHelp}
          checked={s.display.patterns}
          onChange={(v) => updateSettings((d) => void (d.display.patterns = v))}
        />
        <CheckField
          label={t.minimap}
          checked={prefs.showMinimap}
          onChange={(v) => setPrefs({ showMinimap: v })}
        />
      </fieldset>

      <fieldset className="settings-group">
        <legend>{t.grid}</legend>
        <CheckField
          label={t.gridVisible}
          checked={s.grid.visible}
          onChange={(v) => updateSettings((d) => void (d.grid.visible = v))}
        />
        <div className="field-row">
          <SelectField
            label={t.gridSize}
            value={String(s.grid.minorM)}
            options={GRID_STEPS_M.filter((g) => g <= 100).map((g) => ({
              value: String(g),
              label: `${formatNumber(g)} m`,
            }))}
            onChange={(v) => updateSettings((d) => void (d.grid.minorM = Number(v)))}
          />
          <NumberField
            label={t.majorEvery}
            value={s.grid.majorEvery}
            min={1}
            max={100}
            digits={0}
            onCommit={(v) => updateSettings((d) => void (d.grid.majorEvery = Math.round(v)))}
          />
        </div>
      </fieldset>

      <fieldset className="settings-group">
        <legend>{t.snapping}</legend>
        <CheckField
          label={t.snapOn}
          checked={s.snap.enabled}
          onChange={(v) => updateSettings((d) => void (d.snap.enabled = v))}
        />
        <div className="field-row">
          <CheckField
            label={t.snapGrid}
            checked={s.snap.grid}
            onChange={(v) => updateSettings((d) => void (d.snap.grid = v))}
          />
          <CheckField
            label={t.snapVertices}
            checked={s.snap.vertices}
            onChange={(v) => updateSettings((d) => void (d.snap.vertices = v))}
          />
          <CheckField
            label={t.snapEdges}
            checked={s.snap.edges}
            onChange={(v) => updateSettings((d) => void (d.snap.edges = v))}
          />
        </div>
        <SelectField
          label={t.angleStep}
          value={String(s.snap.angleStepDeg)}
          options={[5, 10, 15, 30, 45].map((a) => ({ value: String(a), label: `${a}°` }))}
          onChange={(v) => updateSettings((d) => void (d.snap.angleStepDeg = Number(v)))}
        />
      </fieldset>

      <fieldset className="settings-group">
        <legend>{t.requirements}</legend>
        <NumberField
          label={t.buffer}
          help={t.bufferHelp}
          value={s.requirementBufferPct}
          min={0}
          max={50}
          digits={0}
          onCommit={(v) => updateSettings((d) => void (d.requirementBufferPct = Math.round(v)))}
        />
      </fieldset>

      <fieldset className="settings-group">
        <legend>{t.shortcuts}</legend>
        <CheckField
          label={t.singleKeys}
          help={t.singleKeysHelp}
          checked={prefs.singleKeyShortcuts}
          onChange={(v) => setPrefs({ singleKeyShortcuts: v })}
        />
        <button
          type="button"
          className="btn btn-small"
          aria-expanded={remap}
          onClick={() => setRemap(!remap)}
        >
          {t.remap}
        </button>
        {remap && (
          <div className="remap-grid">
            <p className="field-help">{t.remapHelp}</p>
            {clash && (
              <p className="field-error" role="alert">
                {clash}
              </p>
            )}
            {singles.map((sc) => (
              <label key={sc.id} className="remap-row">
                <span>{t.remapLabel(en.shortcuts[sc.id])}</span>
                <input
                  type="text"
                  maxLength={1}
                  className="mono remap-input"
                  placeholder={formatKey(sc.keys[0] ?? '')}
                  defaultValue={prefs.shortcutOverrides[sc.id] ?? ''}
                  onBlur={(e) => setOverride(sc.id, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="settings-group">
        <legend>{t.data}</legend>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => setState({ dialog: { id: 'deleteAll' } })}
        >
          {t.deleteAll}
        </button>
      </fieldset>
    </Dialog>
  );
}
