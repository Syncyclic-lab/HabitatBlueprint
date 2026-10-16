/** Typed-geometry dialogs: Add habitat by size, Resize to area, Move by, Make copies. */
import { useId, useState, type ReactNode } from 'react';
import { en } from '../../i18n/en.ts';
import type { Shape } from '../../geometry/types.ts';
import {
  resizeToArea,
  shapeArea,
  shapeFromArea,
  type ResizeMode,
  type SizedShapeKind,
} from '../../geometry/resize.ts';
import { shapeBBox, translateShape } from '../../geometry/transform.ts';
import { formatArea } from '../../lib/format.ts';
import { newId, nextName } from '../../model/factory.ts';
import type { HabitatKind } from '../../model/types.ts';
import { announce } from '../a11y/announcer.ts';
import {
  addObject,
  moveSelection,
  objectById,
  updateObject,
  updateZone,
} from '../store/actions.ts';
import { getState, setState } from '../store/store.ts';
import { revealBox } from '../store/view.ts';
import { describeObject } from '../describe.ts';
import { parseNumber, validateNumber } from '../ui/fields.tsx';
import { Dialog } from '../ui/Dialog.tsx';
import { Icon } from '../ui/Icon.tsx';

const M2_PER_FT2 = 0.09290304;
const M_PER_FT = 0.3048;

interface NumInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  help?: string;
  first?: boolean;
}

/** A controlled number input for dialogs, validated on submit. */
function NumInput({ label, value, onChange, error, help, first }: NumInputProps) {
  const id = useId();
  const described =
    [help ? `${id}-help` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="mono"
        value={value}
        data-autofocus={first ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        onChange={(e) => onChange(e.target.value)}
      />
      {help && (
        <span id={`${id}-help`} className="field-help">
          {help}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className="field-error">
          <Icon id="error" size={16} />
          {error}
        </span>
      )}
    </div>
  );
}

function ErrorSummary({ errors }: { errors: Record<string, string | null> }) {
  return Object.values(errors).some(Boolean) ? (
    <p className="error-summary" role="alert">
      {en.planner.dialogs.errorSummary}
    </p>
  ) : null;
}

const close = () => setState({ dialog: null });
const bare = (label: string) => label.replace(/\s*\(.*\)$/, '');

// ───────── Add habitat by size ─────────

export function AddBySizeDialog() {
  const t = en.planner.addBySize;
  const s = getState();
  const units = s.plan?.settings.units ?? 'metric';
  const [kind, setKind] = useState<SizedShapeKind>('rect');
  const [habitatKind, setHabitatKind] = useState<HabitatKind>('habitat');
  const [area, setArea] = useState(units === 'imperial' ? '16146' : '1500');
  const [aspect, setAspect] = useState('1');
  const [sides, setSides] = useState('6');
  const [rotation, setRotation] = useState('0');
  const [typed, setTyped] = useState(false);
  const [x, setX] = useState(String(Math.round(s.view.cx)));
  const [y, setY] = useState(String(Math.round(s.view.cy)));
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const submit = () => {
    const plan = getState().plan;
    if (!plan) return;
    const areaLabel = bare(units === 'imperial' ? t.areaImperial : t.area);
    const e: Record<string, string | null> = {
      area: validateNumber(
        area,
        areaLabel,
        1,
        (plan.settings.mapWidthM * plan.settings.mapHeightM) /
          (units === 'imperial' ? M2_PER_FT2 : 1),
      ),
      aspect: validateNumber(aspect, t.aspect, 0.05, 20),
      sides: kind === 'regular' ? validateNumber(sides, t.sides, 3, 64) : null,
      rotation: validateNumber(rotation, bare(t.rotation), -360, 360),
      x: typed ? validateNumber(x, bare(t.x), 0, plan.settings.mapWidthM) : null,
      y: typed ? validateNumber(y, bare(t.y), 0, plan.settings.mapHeightM) : null,
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    const areaM2 = (parseNumber(area) as number) * (units === 'imperial' ? M2_PER_FT2 : 1);
    const center = typed
      ? { x: parseNumber(x) as number, y: parseNumber(y) as number }
      : { x: getState().view.cx, y: getState().view.cy };
    let shape: Shape = shapeFromArea({
      kind,
      areaM2,
      aspect: parseNumber(aspect) as number,
      sides: Math.round(parseNumber(sides) ?? 6),
      center,
      rotationDeg: parseNumber(rotation) as number,
    });
    // Keep it on the map.
    const b = shapeBBox(shape);
    const dx = Math.min(0, plan.settings.mapWidthM - b.maxX) + Math.max(0, -b.minX);
    const dy = Math.min(0, plan.settings.mapHeightM - b.maxY) + Math.max(0, -b.minY);
    shape = translateShape(shape, dx, dy);
    const name = nextName(plan.objects, en.planner.habitatKinds[habitatKind]);
    const o = {
      id: newId(),
      name,
      phase: 1,
      locked: false,
      hidden: false,
      type: 'habitat' as const,
      kind: habitatKind,
      shape,
      zones: [],
      animals: [],
    };
    addObject(o);
    setState({ dialog: null, panelTab: 'inspector' });
    revealBox(shapeBBox(shape));
    const after = getState().plan;
    if (after) announce(en.planner.selection.selected(describeObject(o, after)));
  };

  return (
    <Dialog
      title={t.title}
      onClose={close}
      onSubmit={submit}
      actions={
        <button type="submit" className="btn btn-primary">
          {t.add}
        </button>
      }
    >
      <ErrorSummary errors={errors} />
      <fieldset>
        <legend>{t.kind}</legend>
        <div className="radio-row">
          {(['habitat', 'aviary', 'aquarium', 'exhibit'] as const).map((k) => (
            <label key={k} className="check-row">
              <input
                type="radio"
                name="hkind"
                checked={habitatKind === k}
                onChange={() => setHabitatKind(k)}
              />
              {en.planner.habitatKinds[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.shape}</legend>
        <div className="radio-row">
          {(['rect', 'ellipse', 'regular'] as const).map((k) => (
            <label key={k} className="check-row">
              <input type="radio" name="shape" checked={kind === k} onChange={() => setKind(k)} />
              {t[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field-row">
        <NumInput
          label={units === 'imperial' ? t.areaImperial : t.area}
          value={area}
          onChange={setArea}
          error={errors.area ?? null}
          first
        />
        <NumInput
          label={t.aspect}
          value={aspect}
          onChange={setAspect}
          error={errors.aspect ?? null}
          help={t.aspectHelp}
        />
        {kind === 'regular' && (
          <NumInput
            label={t.sides}
            value={sides}
            onChange={setSides}
            error={errors.sides ?? null}
          />
        )}
        <NumInput
          label={t.rotation}
          value={rotation}
          onChange={setRotation}
          error={errors.rotation ?? null}
        />
      </div>
      <fieldset>
        <legend>{t.position}</legend>
        <div className="radio-row">
          <label className="check-row">
            <input type="radio" name="pos" checked={!typed} onChange={() => setTyped(false)} />
            {t.positionCentre}
          </label>
          <label className="check-row">
            <input type="radio" name="pos" checked={typed} onChange={() => setTyped(true)} />
            {t.positionTyped}
          </label>
        </div>
      </fieldset>
      {typed && (
        <div className="field-row">
          <NumInput label={t.x} value={x} onChange={setX} error={errors.x ?? null} />
          <NumInput label={t.y} value={y} onChange={setY} error={errors.y ?? null} />
        </div>
      )}
    </Dialog>
  );
}

// ───────── Resize to area ─────────

export function ResizeToAreaDialog({ objectId, zoneId }: { objectId: string; zoneId?: string }) {
  const t = en.planner.resize;
  const plan = getState().plan;
  const o = plan ? objectById(plan, objectId) : undefined;
  const zone = o?.type === 'habitat' && zoneId ? o.zones.find((z) => z.id === zoneId) : undefined;
  const shape: Shape | undefined = zone ? zone.shape : o && 'shape' in o ? o.shape : undefined;
  const units = plan?.settings.units ?? 'metric';
  const factor = units === 'imperial' ? M2_PER_FT2 : 1;
  const current = shape ? shapeArea(shape) : 0;
  const [target, setTarget] = useState(String(Math.round(current / factor)));
  const [mode, setMode] = useState<ResizeMode>('uniform');
  const [error, setError] = useState<string | null>(null);
  if (!o || !shape) return null;

  const submit = () => {
    const label = bare(units === 'imperial' ? t.targetImperial : t.target);
    const problem = validateNumber(target, label, 0.01, 1e9);
    setError(problem);
    if (problem) return;
    const next = resizeToArea(
      shape,
      (parseNumber(target) as number) * factor,
      shape.kind === 'rect' ? mode : 'uniform',
    );
    if (zone && o.type === 'habitat') {
      updateZone(o.id, { ...zone, shape: next }, en.planner.history.resize(o.name));
    } else {
      updateObject(o.id, en.planner.history.resize(o.name), (d) => {
        if ('shape' in d) d.shape = next;
      });
    }
    setState({ dialog: null });
    announce(`${en.planner.history.resize(o.name)}: ${formatArea(shapeArea(next), units)}`);
  };

  return (
    <Dialog
      title={t.title}
      onClose={close}
      onSubmit={submit}
      actions={
        <button type="submit" className="btn btn-primary">
          {t.resize}
        </button>
      }
    >
      <p>{t.current(formatArea(current, units))}</p>
      <NumInput
        label={units === 'imperial' ? t.targetImperial : t.target}
        value={target}
        onChange={setTarget}
        error={error}
        first
      />
      {shape.kind === 'rect' && (
        <fieldset>
          <legend>{t.keep}</legend>
          {(['uniform', 'keepWidth', 'keepHeight'] as const).map((m) => (
            <label key={m} className="check-row">
              <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
              {t[m]}
            </label>
          ))}
        </fieldset>
      )}
    </Dialog>
  );
}

// ───────── Move by ─────────

export function MoveByDialog() {
  const t = en.planner.moveBy;
  const units = getState().plan?.settings.units ?? 'metric';
  const unitFactor = units === 'imperial' ? M_PER_FT : 1;
  const label = (l: string) => (units === 'imperial' ? l.replace('(m)', '(ft)') : l);
  const [dx, setDx] = useState('0');
  const [dy, setDy] = useState('0');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const submit = () => {
    const e = {
      dx: validateNumber(dx, bare(t.dx), -100_000, 100_000),
      dy: validateNumber(dy, bare(t.dy), -100_000, 100_000),
    };
    setErrors(e);
    if (e.dx || e.dy) return;
    moveSelection(
      (parseNumber(dx) as number) * unitFactor,
      (parseNumber(dy) as number) * unitFactor,
    );
    setState({ dialog: null });
  };
  return (
    <Dialog
      title={t.title}
      onClose={close}
      onSubmit={submit}
      actions={
        <button type="submit" className="btn btn-primary">
          {t.move}
        </button>
      }
    >
      <ErrorSummary errors={errors} />
      <div className="field-row">
        <NumInput label={label(t.dx)} value={dx} onChange={setDx} error={errors.dx ?? null} first />
        <NumInput label={label(t.dy)} value={dy} onChange={setDy} error={errors.dy ?? null} />
      </div>
    </Dialog>
  );
}

export function DialogSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="dialog-section">
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}
