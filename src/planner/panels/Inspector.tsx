/**
 * The Inspector (docs/03 §4.1): every property of the selection as labelled form fields,
 * including each shape's geometry as numbers. This is the non-visual, non-drag editing path.
 */
import type { Draft } from 'immer';
import { useMemo } from 'react';
import { en } from '../../i18n/en.ts';
import { BARRIERS, OBJECT_TYPES } from '../../data/index.ts';
import { FACILITY_ICON_IDS } from '../../assets/icons/icons.ts';
import type { Shape, Vec2 } from '../../geometry/types.ts';
import { fitShapeToBox, normalizeDeg, rotateShape, shapeBBox } from '../../geometry/transform.ts';
import { polylineLength } from '../../geometry/buffer.ts';
import { signedArea } from '../../geometry/polygon.ts';
import { formatArea, formatLength, formatPercent, fromMeters, toMeters } from '../../lib/format.ts';
import { habitatMeasure, objectArea } from '../../model/totals.ts';
import type { HabitatKind, MapObject, Plan } from '../../model/types.ts';
import { typeLabel } from '../describe.ts';
import {
  deleteSelection,
  duplicateSelection,
  objectById,
  renameObject,
  setAreaFor,
  updateObject,
} from '../store/actions.ts';
import { setState, usePlanner } from '../store/store.ts';
import { usePlanTotals } from '../hooks/useTotals.ts';
import { enterVertexMode } from '../map/vertexMode.ts';
import { CheckField, NumberField, SelectField, TextField } from '../ui/fields.tsx';
import { Icon } from '../ui/Icon.tsx';
import { AnimalsSection } from './AnimalsSection.tsx';
import { MultiSelection } from './MultiSelection.tsx';
import { PointsTable } from './PointsTable.tsx';
import { ZonesSection } from './ZonesSection.tsx';

const t = en.planner.inspector;
const h = en.planner.history;

export function Inspector() {
  const plan = usePlanner((s) => s.plan);
  const selection = usePlanner((s) => s.selection);
  if (!plan) return null;
  if (selection.length === 0) {
    return (
      <>
        <h2>{t.heading}</h2>
        <p>{t.nothing}</p>
      </>
    );
  }
  if (selection.length > 1) return <MultiSelection />;
  const o = objectById(plan, selection[0] as string);
  if (!o) return null;
  return <SingleObject o={o} plan={plan} />;
}

function SingleObject({ o, plan }: { o: MapObject; plan: Plan }) {
  const units = plan.settings.units;
  const edit = (recipe: (d: Draft<MapObject>) => void) =>
    updateObject(o.id, h.edit(o.name), recipe);
  const len = (m: number) => fromMeters(m, units);
  const unitLabel = (label: string) =>
    units === 'imperial' ? label.replace('(m)', '(ft)') : label;

  return (
    <>
      <h2>{o.name}</h2>
      <p className="field-help">{typeLabel(o)}</p>

      <section className="panel-section" aria-labelledby="insp-general">
        <h3 id="insp-general">{t.general}</h3>
        <TextField
          label={t.name}
          value={o.name}
          maxLength={60}
          required
          onCommit={(v) => renameObject(o.id, v)}
        />
        <TypeFields o={o} edit={edit} />
        <SelectField
          label={t.area}
          value={o.areaId ?? ''}
          options={[
            { value: '', label: t.noArea },
            ...plan.areas.map((a) => ({ value: a.id, label: a.name })),
          ]}
          onChange={(v) => setAreaFor(v || undefined, [o.id])}
        />
        <NumberField
          label={t.phase}
          value={o.phase}
          min={1}
          max={99}
          digits={0}
          onCommit={(v) =>
            edit((d) => {
              d.phase = Math.round(v);
            })
          }
        />
        <TextField
          label={t.notes}
          value={o.notes ?? ''}
          maxLength={2000}
          multiline
          onCommit={(v) =>
            edit((d) => {
              if (v.trim()) d.notes = v;
              else delete d.notes;
            })
          }
        />
        <div className="field-row">
          <CheckField
            label={t.locked}
            checked={o.locked}
            onChange={(v) =>
              updateObject(o.id, h.lock(o.name), (d) => {
                d.locked = v;
              })
            }
          />
          <CheckField
            label={t.hidden}
            checked={o.hidden}
            onChange={(v) =>
              updateObject(o.id, h.hide(o.name), (d) => {
                d.hidden = v;
              })
            }
          />
        </div>
      </section>

      <SizeSection o={o} plan={plan} />

      <section className="panel-section" aria-labelledby="insp-geom">
        <h3 id="insp-geom">{t.geometry}</h3>
        <GeometryFields o={o} edit={edit} len={len} unitLabel={unitLabel} units={units} />
        <div className="inline-actions">
          {'shape' in o && (
            <button
              type="button"
              className="btn btn-small"
              disabled={o.locked}
              onClick={() => setState({ dialog: { id: 'resizeToArea', objectId: o.id } })}
            >
              {t.resizeToArea}
            </button>
          )}
          <button
            type="button"
            className="btn btn-small"
            disabled={o.locked}
            onClick={() => setState({ dialog: { id: 'moveBy' } })}
          >
            {t.moveBy}
          </button>
          <button
            type="button"
            className="btn btn-small"
            disabled={o.locked}
            onClick={() => enterVertexMode()}
          >
            {t.editPoints}
          </button>
        </div>
      </section>

      {o.type === 'habitat' && <ZonesSection habitat={o} plan={plan} />}
      {o.type === 'habitat' && <AnimalsSection habitat={o} plan={plan} />}
      {o.type === 'habitat' && (
        <section className="panel-section" aria-labelledby="insp-barrier">
          <h3 id="insp-barrier">{t.barrierHeading}</h3>
          <SelectField
            label={t.barrierType}
            value={o.barrier?.barrierId ?? ''}
            options={[
              { value: '', label: t.barrierNone },
              ...BARRIERS.barriers.map((b) => ({
                value: b.id,
                label: `${b.label} (${t.barrierGrade(b.grade)})`,
              })),
            ]}
            help={t.barrierUnverified}
            onChange={(v) =>
              edit((d) => {
                if (d.type !== 'habitat') return;
                if (v) d.barrier = { barrierId: v };
                else delete d.barrier;
              })
            }
          />
        </section>
      )}

      <div className="inline-actions panel-section">
        <button type="button" className="btn btn-small" onClick={() => duplicateSelection([o.id])}>
          <Icon id="copy" size={16} />
          {en.planner.actions.duplicate}
        </button>
        <button
          type="button"
          className="btn btn-small btn-danger"
          disabled={o.locked}
          onClick={() => deleteSelection([o.id])}
        >
          <Icon id="trash" size={16} />
          {en.planner.actions.delete}
        </button>
      </div>
    </>
  );
}

type Edit = (recipe: (d: Draft<MapObject>) => void) => void;

function TypeFields({ o, edit }: { o: MapObject; edit: Edit }) {
  switch (o.type) {
    case 'habitat':
      return (
        <SelectField<HabitatKind>
          label={t.kind}
          value={o.kind}
          options={(['habitat', 'aviary', 'aquarium', 'exhibit'] as const).map((k) => ({
            value: k,
            label: en.planner.habitatKinds[k],
          }))}
          onChange={(v) =>
            edit((d) => {
              if (d.type === 'habitat') d.kind = v;
            })
          }
        />
      );
    case 'building':
      return (
        <SelectField
          label={t.buildingType}
          value={o.buildingType}
          options={OBJECT_TYPES.buildingTypes.map((b) => ({ value: b.id, label: b.label }))}
          onChange={(v) =>
            edit((d) => {
              if (d.type === 'building') d.buildingType = v;
            })
          }
        />
      );
    case 'path':
      return (
        <>
          <SelectField
            label={t.pathType}
            value={o.pathType}
            options={OBJECT_TYPES.pathTypes.map((p) => ({ value: p.id, label: p.label }))}
            onChange={(v) =>
              edit((d) => {
                if (d.type === 'path') d.pathType = v;
              })
            }
          />
          <NumberField
            label={t.pathWidth}
            value={o.widthM}
            min={OBJECT_TYPES.widthLimitsM.min}
            max={OBJECT_TYPES.widthLimitsM.max}
            step={0.5}
            digits={1}
            onCommit={(v) =>
              edit((d) => {
                if (d.type === 'path') d.widthM = v;
              })
            }
          />
          <SelectField
            label={t.cap}
            value={o.cap}
            options={[
              { value: 'round', label: en.planner.tools.capRound },
              { value: 'flat', label: en.planner.tools.capFlat },
            ]}
            onChange={(v) =>
              edit((d) => {
                if (d.type === 'path') d.cap = v;
              })
            }
          />
          <CheckField
            label={t.smooth}
            checked={o.line.smooth}
            onChange={(v) =>
              edit((d) => {
                if (d.type === 'path') d.line.smooth = v;
              })
            }
          />
        </>
      );
    case 'water':
      return (
        <CheckField
          label={t.deep}
          checked={o.deep}
          onChange={(v) =>
            edit((d) => {
              if (d.type === 'water') d.deep = v;
            })
          }
        />
      );
    case 'barrier':
      return (
        <SelectField
          label={t.barrierType}
          value={o.barrierId}
          options={BARRIERS.barriers.map((b) => ({
            value: b.id,
            label: `${b.label} (${t.barrierGrade(b.grade)})`,
          }))}
          help={t.barrierUnverified}
          onChange={(v) =>
            edit((d) => {
              if (d.type === 'barrier') d.barrierId = v;
            })
          }
        />
      );
    case 'icon':
      return (
        <SelectField
          label={en.planner.tools.icon}
          value={o.iconId}
          options={FACILITY_ICON_IDS.map((id) => ({ value: id, label: en.planner.facilities[id] }))}
          onChange={(v) =>
            edit((d) => {
              if (d.type === 'icon') d.iconId = v;
            })
          }
        />
      );
    case 'label':
      return (
        <TextField
          label={t.text}
          value={o.text}
          maxLength={200}
          required
          onCommit={(v) =>
            edit((d) => {
              if (d.type === 'label') d.text = v;
            })
          }
        />
      );
    default:
      return null;
  }
}

function SizeSection({ o, plan }: { o: MapObject; plan: Plan }) {
  const totals = usePlanTotals();
  const units = plan.settings.units;
  const mapM2 = plan.settings.mapWidthM * plan.settings.mapHeightM;
  const rows: [string, string][] = useMemo(() => {
    if (o.type === 'habitat') {
      const m = habitatMeasure(o, mapM2);
      const out: [string, string][] = [
        [t.total, formatArea(m.totalM2, units)],
        [t.land, formatArea(m.landM2, units)],
        [t.water, formatArea(m.waterM2, units)],
        [t.deepWater, formatArea(m.deepWaterM2, units)],
        [t.climbing, formatArea(m.climbingM2, units)],
      ];
      if (o.kind === 'aviary') out.push([t.flying, formatArea(m.flyingM2, units)]);
      out.push(
        [t.perimeter, formatLength(m.perimeterM, units)],
        [t.pctMap, formatPercent(m.pctOfMap)],
      );
      if (totals && totals.plannedM2 > 0)
        out.push([t.pctPlanned, formatPercent(m.totalM2 / totals.plannedM2)]);
      return out;
    }
    if (o.type === 'path') {
      return [
        [t.length, formatLength(polylineLength(o.line.points), units)],
        [t.pavedArea, formatArea(objectArea(o) ?? 0, units)],
      ];
    }
    if (o.type === 'barrier')
      return [[t.length, formatLength(polylineLength(o.line.points), units)]];
    if (o.type === 'measure') {
      return o.mode === 'area'
        ? [[t.total, formatArea(Math.abs(signedArea(o.points)), units)]]
        : [[t.length, formatLength(polylineLength(o.points), units)]];
    }
    const area = objectArea(o);
    return area === null
      ? []
      : [
          [t.footprint, formatArea(area, units)],
          [t.pctMap, formatPercent(area / mapM2)],
        ];
  }, [o, mapM2, units, totals]);
  if (rows.length === 0) return null;
  return (
    <section className="panel-section" aria-labelledby="insp-size">
      <h3 id="insp-size">{t.size}</h3>
      <table className="measure-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface GeometryProps {
  o: MapObject;
  edit: Edit;
  len: (m: number) => number;
  unitLabel: (label: string) => string;
  units: Plan['settings']['units'];
}

function GeometryFields({ o, edit, len, unitLabel, units }: GeometryProps) {
  const m = (v: number) => toMeters(v, units);
  const disabled = o.locked;
  const setShape = (shape: Shape) =>
    edit((d) => {
      if ('shape' in d) d.shape = shape;
    });

  if ('shape' in o) {
    const s = o.shape;
    if (s.kind === 'rect') {
      return (
        <>
          <div className="field-row">
            <NumberField
              label={unitLabel(t.x)}
              value={len(s.x)}
              disabled={disabled}
              onCommit={(v) => setShape({ ...s, x: m(v) })}
            />
            <NumberField
              label={unitLabel(t.y)}
              value={len(s.y)}
              disabled={disabled}
              onCommit={(v) => setShape({ ...s, y: m(v) })}
            />
            <NumberField
              label={unitLabel(t.width)}
              value={len(s.w)}
              min={0.01}
              disabled={disabled}
              onCommit={(v) => setShape({ ...s, w: m(v) })}
            />
            <NumberField
              label={unitLabel(t.height)}
              value={len(s.h)}
              min={0.01}
              disabled={disabled}
              onCommit={(v) => setShape({ ...s, h: m(v) })}
            />
            <NumberField
              label={t.rotation}
              value={s.rotationDeg}
              step={15}
              digits={1}
              disabled={disabled}
              onCommit={(v) => setShape({ ...s, rotationDeg: normalizeDeg(v) })}
            />
            <NumberField
              label={unitLabel(t.cornerRadius)}
              value={len(s.cornerRadiusM ?? 0)}
              min={0}
              disabled={disabled}
              onCommit={(v) =>
                setShape(v > 0 ? { ...s, cornerRadiusM: m(v) } : { ...s, cornerRadiusM: 0 })
              }
            />
          </div>
        </>
      );
    }
    if (s.kind === 'ellipse') {
      return (
        <div className="field-row">
          <NumberField
            label={unitLabel(t.centreX)}
            value={len(s.cx)}
            disabled={disabled}
            onCommit={(v) => setShape({ ...s, cx: m(v) })}
          />
          <NumberField
            label={unitLabel(t.centreY)}
            value={len(s.cy)}
            disabled={disabled}
            onCommit={(v) => setShape({ ...s, cy: m(v) })}
          />
          <NumberField
            label={unitLabel(t.width)}
            value={len(s.rx * 2)}
            min={0.02}
            disabled={disabled}
            onCommit={(v) => setShape({ ...s, rx: m(v) / 2 })}
          />
          <NumberField
            label={unitLabel(t.height)}
            value={len(s.ry * 2)}
            min={0.02}
            disabled={disabled}
            onCommit={(v) => setShape({ ...s, ry: m(v) / 2 })}
          />
          <NumberField
            label={t.rotation}
            value={s.rotationDeg}
            step={15}
            digits={1}
            disabled={disabled}
            onCommit={(v) => setShape({ ...s, rotationDeg: normalizeDeg(v) })}
          />
        </div>
      );
    }
    const box = shapeBBox(s);
    const setBox = (patch: Partial<{ x: number; y: number; w: number; h: number }>) => {
      const x = patch.x ?? box.minX;
      const y = patch.y ?? box.minY;
      const w = patch.w ?? box.maxX - box.minX;
      const hh = patch.h ?? box.maxY - box.minY;
      setShape(fitShapeToBox(s, { minX: x, minY: y, maxX: x + w, maxY: y + hh }));
    };
    return (
      <>
        <div className="field-row">
          <NumberField
            label={unitLabel(t.left)}
            value={len(box.minX)}
            disabled={disabled}
            onCommit={(v) => setBox({ x: m(v) })}
          />
          <NumberField
            label={unitLabel(t.top)}
            value={len(box.minY)}
            disabled={disabled}
            onCommit={(v) => setBox({ y: m(v) })}
          />
          <NumberField
            label={unitLabel(t.width)}
            value={len(box.maxX - box.minX)}
            min={0.01}
            disabled={disabled}
            onCommit={(v) => setBox({ w: m(v) })}
          />
          <NumberField
            label={unitLabel(t.height)}
            value={len(box.maxY - box.minY)}
            min={0.01}
            disabled={disabled}
            onCommit={(v) => setBox({ h: m(v) })}
          />
          <NumberField
            label={t.rotateBy}
            value={0}
            step={15}
            digits={1}
            disabled={disabled}
            onCommit={(v) => {
              if (v !== 0)
                updateObject(o.id, en.planner.history.rotate(o.name), (d) => {
                  if ('shape' in d) d.shape = rotateShape(s, v);
                });
            }}
          />
          <NumberField
            label={unitLabel(t.cornerRadius)}
            value={len(s.cornerRadiusM ?? 0)}
            min={0}
            disabled={disabled}
            onCommit={(v) => setShape({ ...s, cornerRadiusM: m(v) })}
          />
        </div>
        <PointsTable
          name={o.name}
          points={s.points}
          closed
          disabled={disabled}
          units={units}
          onChange={(points: Vec2[], label: string) =>
            updateObject(o.id, label, (d) => {
              if ('shape' in d && d.shape.kind === 'polygon') d.shape.points = points;
            })
          }
        />
      </>
    );
  }
  if ('line' in o || o.type === 'measure') {
    const points = 'line' in o ? o.line.points : o.points;
    return (
      <PointsTable
        name={o.name}
        points={points}
        closed={o.type === 'measure' && o.mode === 'area'}
        disabled={disabled}
        units={units}
        onChange={(next, label) =>
          updateObject(o.id, label, (d) => {
            if ('line' in d) d.line.points = next;
            else if (d.type === 'measure') d.points = next;
          })
        }
      />
    );
  }
  // Icons and labels: a point, a rotation and a size.
  return (
    <div className="field-row">
      <NumberField
        label={unitLabel(t.x)}
        value={len(o.at.x)}
        disabled={disabled}
        onCommit={(v) =>
          edit((d) => {
            if ('at' in d) d.at.x = m(v);
          })
        }
      />
      <NumberField
        label={unitLabel(t.y)}
        value={len(o.at.y)}
        disabled={disabled}
        onCommit={(v) =>
          edit((d) => {
            if ('at' in d) d.at.y = m(v);
          })
        }
      />
      <NumberField
        label={t.rotation}
        value={o.rotationDeg}
        step={15}
        digits={1}
        disabled={disabled}
        onCommit={(v) =>
          edit((d) => {
            if ('at' in d) d.rotationDeg = normalizeDeg(v);
          })
        }
      />
      {o.type === 'icon' && (
        <NumberField
          label={unitLabel(t.iconSize)}
          value={len(o.sizeM)}
          min={0.5}
          max={200}
          disabled={disabled}
          onCommit={(v) =>
            edit((d) => {
              if (d.type === 'icon') {
                d.sizeM = m(v);
                d.sizing = 'map';
              }
            })
          }
        />
      )}
      {o.type === 'label' && (
        <NumberField
          label={t.textSize}
          value={o.size}
          min={6}
          max={200}
          disabled={disabled}
          onCommit={(v) =>
            edit((d) => {
              if (d.type === 'label') d.size = v;
            })
          }
        />
      )}
    </div>
  );
}
