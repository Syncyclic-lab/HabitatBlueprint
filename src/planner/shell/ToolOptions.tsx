import { useId } from 'react';
import { en } from '../../i18n/en.ts';
import { BARRIERS, OBJECT_TYPES } from '../../data/index.ts';
import { FACILITY_ICON_IDS } from '../../assets/icons/icons.ts';
import type { HabitatKind } from '../../model/types.ts';
import { objectById } from '../store/actions.ts';
import {
  setState,
  usePlanner,
  type ShapeMode,
  type ToolOptions as Options,
} from '../store/store.ts';
import {
  pathWidthHint,
  setOptions,
  setShapeMode,
  setTool,
  WIDTH_LIMITS,
} from '../tools/drawing.ts';
import { NumberField } from '../ui/fields.tsx';

const t = en.planner.tools;

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}

/** A group of toggle buttons; exactly one is pressed. */
function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div className="opt">
      <span className="opt-label" id={id}>
        {label}
      </span>
      <div className="segmented" role="group" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Select<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div className="opt">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const shapeOptions = (allowFreehand = true) =>
  (['polygon', 'rect', 'ellipse', ...(allowFreehand ? ['freehand'] : [])] as ShapeMode[]).map(
    (m) => ({
      value: m,
      label: t.shapeModes[m],
    }),
  );

function ShapeChoice({ o }: { o: Options }) {
  return (
    <Segmented
      label={t.shape}
      value={o.shapeMode}
      options={shapeOptions()}
      onChange={setShapeMode}
    />
  );
}

/** Options for the active tool, shown above the map. */
export function ToolOptions() {
  const tool = usePlanner((s) => s.tool);
  const o = usePlanner((s) => s.options);
  const plan = usePlanner((s) => s.plan);
  const zoneHabitat = o.zoneTarget && plan ? objectById(plan, o.zoneTarget.habitatId) : undefined;
  const hint = tool === 'path' && o.pathMode === 'line' ? pathWidthHint(o.pathType) : null;

  return (
    <div className="pl-options" role="group" aria-label={t.optionsLabel}>
      {tool === 'select' && (
        <button
          type="button"
          className="btn btn-small"
          onClick={() => setState({ dialog: { id: 'addBySize' } })}
        >
          {en.planner.map.addBySize}
        </button>
      )}

      {tool === 'habitat' && zoneHabitat && o.zoneTarget && (
        <>
          <p className="opt-zone">
            {t.drawingZone(en.planner.zones[o.zoneTarget.kind].toLowerCase(), zoneHabitat.name)}
          </p>
          <ShapeChoice o={o} />
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              setOptions({ zoneTarget: null });
              setTool('select');
            }}
          >
            {t.stopZone}
          </button>
        </>
      )}

      {tool === 'habitat' && !o.zoneTarget && (
        <>
          <Segmented<HabitatKind>
            label={t.kind}
            value={o.habitatKind}
            options={(['habitat', 'aviary', 'aquarium', 'exhibit'] as const).map((k) => ({
              value: k,
              label: en.planner.habitatKinds[k],
            }))}
            onChange={(v) => setOptions({ habitatKind: v })}
          />
          <ShapeChoice o={o} />
        </>
      )}

      {tool === 'building' && (
        <>
          <Select
            label={t.type}
            value={o.buildingType}
            options={OBJECT_TYPES.buildingTypes.map((b) => ({ value: b.id, label: b.label }))}
            onChange={(v) => setOptions({ buildingType: v })}
          />
          <ShapeChoice o={o} />
        </>
      )}

      {tool === 'path' && (
        <>
          <Segmented
            label={t.mode}
            value={o.pathMode}
            options={[
              { value: 'line', label: t.pathLine },
              { value: 'area', label: t.pathArea },
            ]}
            onChange={(v) => setOptions({ pathMode: v })}
          />
          {o.pathMode === 'line' ? (
            <>
              <Select
                label={t.type}
                value={o.pathType}
                options={OBJECT_TYPES.pathTypes.map((p) => ({ value: p.id, label: p.label }))}
                onChange={(v) => {
                  const def = OBJECT_TYPES.pathTypes.find((p) => p.id === v);
                  setOptions({ pathType: v, pathWidthM: def?.defaultWidthM ?? o.pathWidthM });
                }}
              />
              <NumberField
                label={t.width}
                value={o.pathWidthM}
                min={WIDTH_LIMITS.min}
                max={WIDTH_LIMITS.max}
                step={0.5}
                digits={1}
                onCommit={(v) => setOptions({ pathWidthM: v })}
                className="opt"
              />
              <Segmented
                label={t.ends}
                value={o.pathCap}
                options={[
                  { value: 'round', label: t.capRound },
                  { value: 'flat', label: t.capFlat },
                ]}
                onChange={(v) => setOptions({ pathCap: v })}
              />
              <label className="check-row opt">
                <input
                  type="checkbox"
                  checked={o.pathSmooth}
                  onChange={(e) => setOptions({ pathSmooth: e.target.checked })}
                />
                {t.smooth}
              </label>
              {hint && <p className="hint">{t.widthHint(hint.min, hint.max, hint.source)}</p>}
            </>
          ) : (
            <ShapeChoice o={o} />
          )}
        </>
      )}

      {tool === 'barrier' && (
        <Select
          label={t.type}
          value={o.barrierId}
          options={BARRIERS.barriers.map((b) => ({
            value: b.id,
            label: `${b.label} (${en.planner.inspector.barrierGrade(b.grade)})`,
          }))}
          onChange={(v) => setOptions({ barrierId: v })}
        />
      )}

      {tool === 'water' && (
        <>
          <ShapeChoice o={o} />
          <label className="check-row opt">
            <input
              type="checkbox"
              checked={o.waterDeep}
              onChange={(e) => setOptions({ waterDeep: e.target.checked })}
            />
            {t.deep}
          </label>
        </>
      )}

      {tool === 'planting' && <ShapeChoice o={o} />}

      {tool === 'icon' && (
        <>
          <Select
            label={t.icon}
            value={o.iconId}
            options={FACILITY_ICON_IDS.map((id) => ({
              value: id,
              label: en.planner.facilities[id],
            }))}
            onChange={(v) => setOptions({ iconId: v })}
          />
          <Segmented
            label={t.sizing}
            value={o.iconSizing}
            options={[
              { value: 'screen', label: t.sizingScreen },
              { value: 'map', label: t.sizingMap },
            ]}
            onChange={(v) => setOptions({ iconSizing: v })}
          />
        </>
      )}

      {tool === 'label' && <LabelText value={o.labelText} />}

      {tool === 'measure' && (
        <Segmented
          label={t.mode}
          value={o.measureMode}
          options={[
            { value: 'distance', label: t.measureDistance },
            { value: 'area', label: t.measureArea },
          ]}
          onChange={(v) => setOptions({ measureMode: v })}
        />
      )}
    </div>
  );
}

function LabelText({ value }: { value: string }) {
  const id = useId();
  return (
    <div className="opt">
      <label htmlFor={id}>{t.text}</label>
      <input
        id={id}
        type="text"
        maxLength={200}
        value={value}
        onChange={(e) => setOptions({ labelText: e.target.value })}
      />
    </div>
  );
}
