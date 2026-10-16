/** Stats (docs/03 §4.5). Every table is a real table; the chart has a "view as table" toggle. */
import { useState } from 'react';
import { en } from '../../i18n/en.ts';
import { getPathType } from '../../data/index.ts';
import { formatArea, formatLength, formatPercent } from '../../lib/format.ts';
import { checkHabitat } from '../../model/requirements.ts';
import { habitatMeasure } from '../../model/totals.ts';
import type { HabitatObject, ObjectType } from '../../model/types.ts';
import { usePlanTotals } from '../hooks/useTotals.ts';
import { usePlanner } from '../store/store.ts';
import { ScrollRegion } from '../ui/ScrollRegion.tsx';

const t = en.planner.stats;

export function StatsPanel() {
  const plan = usePlanner((s) => s.plan);
  const totals = usePlanTotals();
  const [chart, setChart] = useState(true);
  if (!plan || !totals) return null;
  const units = plan.settings.units;
  const mapM2 = totals.mapM2;
  const byType = (Object.entries(totals.areaByType) as [ObjectType, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const maxArea = Math.max(1, ...byType.map(([, v]) => v));
  const habitats = plan.objects.filter((o): o is HabitatObject => o.type === 'habitat');

  return (
    <>
      <h2>{t.heading}</h2>
      {totals.approximate && <p className="notice">{t.approximate}</p>}
      <table className="data-table">
        <caption>{t.summaryCaption}</caption>
        <tbody>
          <tr>
            <th scope="row">{t.map}</th>
            <td className="num">{formatArea(mapM2, units)}</td>
          </tr>
          <tr>
            <th scope="row">{t.planned}</th>
            <td className="num">{formatArea(totals.plannedM2, units)}</td>
          </tr>
          <tr>
            <th scope="row">{t.free}</th>
            <td className="num">{formatArea(totals.freeM2, units)}</td>
          </tr>
          <tr>
            <th scope="row">{t.used}</th>
            <td className="num">{formatPercent(totals.plannedM2 / mapM2)}</td>
          </tr>
        </tbody>
      </table>

      <h3>{t.byTypeCaption}</h3>
      <button
        type="button"
        className="btn btn-small"
        aria-pressed={!chart}
        onClick={() => setChart(!chart)}
      >
        {t.viewTable}
      </button>
      {byType.length === 0 ? (
        <p>{t.none}</p>
      ) : chart ? (
        <div className="bar-chart" role="img" aria-label={t.chartLabel}>
          {byType.map(([type, area]) => (
            <div key={type} className="bar-row">
              <span>{en.planner.types[type]}</span>
              <span className="bar-value">{formatArea(area, units)}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(area / maxArea) * 100}%` }} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <table className="data-table">
          <caption>{t.byTypeCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.type}</th>
              <th scope="col" className="num">
                {t.count}
              </th>
              <th scope="col" className="num">
                {t.area}
              </th>
            </tr>
          </thead>
          <tbody>
            {byType.map(([type, area]) => (
              <tr key={type}>
                <th scope="row">{en.planner.types[type]}</th>
                <td className="num">{totals.countByType[type] ?? 0}</td>
                <td className="num">{formatArea(area, units)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ScrollRegion label={t.habitatsCaption}>
        <table className="data-table">
          <caption>{t.habitatsCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.name}</th>
              <th scope="col">{t.kind}</th>
              <th scope="col" className="num">
                {t.total}
              </th>
              <th scope="col" className="num">
                {t.land}
              </th>
              <th scope="col" className="num">
                {t.water}
              </th>
              <th scope="col" className="num">
                {t.deep}
              </th>
              <th scope="col" className="num">
                {t.climbing}
              </th>
              <th scope="col">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {habitats.length === 0 && (
              <tr>
                <td colSpan={8}>{t.none}</td>
              </tr>
            )}
            {habitats.map((h) => {
              const m = habitatMeasure(h, mapM2);
              const c = checkHabitat(h, m, plan.speciesLibrary, plan.settings.requirementBufferPct);
              return (
                <tr key={h.id}>
                  <th scope="row">{h.name}</th>
                  <td>{en.planner.habitatKinds[h.kind]}</td>
                  <td className="num">{formatArea(m.totalM2, units)}</td>
                  <td className="num">{formatArea(m.landM2, units)}</td>
                  <td className="num">{formatArea(m.waterM2, units)}</td>
                  <td className="num">{formatArea(m.deepWaterM2, units)}</td>
                  <td className="num">{formatArea(m.climbingM2, units)}</td>
                  <td>
                    {c.status === 'fits'
                      ? en.planner.inspector.requirementFits
                      : c.status === 'short'
                        ? en.planner.inspector.requirementShort(formatArea(c.shortM2, units))
                        : c.status === 'noData'
                          ? en.planner.inspector.requirementNoData
                          : en.planner.inspector.noAnimals}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollRegion>

      <table className="data-table">
        <caption>{t.pathsCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.type}</th>
            <th scope="col" className="num">
              {t.length}
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(totals.pathLengthByType).length === 0 && (
            <tr>
              <td colSpan={2}>{t.none}</td>
            </tr>
          )}
          {Object.entries(totals.pathLengthByType).map(([type, len]) => (
            <tr key={type}>
              <th scope="row">{getPathType(type)?.label ?? type}</th>
              <td className="num">{formatLength(len, units)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="data-table">
        <caption>{t.barriersCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.grade}</th>
            <th scope="col" className="num">
              {t.length}
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(totals.barrierLengthByGrade).length === 0 && (
            <tr>
              <td colSpan={2}>{t.none}</td>
            </tr>
          )}
          {Object.entries(totals.barrierLengthByGrade)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([grade, len]) => (
              <tr key={grade}>
                <th scope="row">
                  {grade === '0'
                    ? en.planner.inspector.barrierNone
                    : en.planner.inspector.barrierGrade(Number(grade))}
                </th>
                <td className="num">{formatLength(len, units)}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <table className="data-table">
        <caption>{t.censusCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.species}</th>
            <th scope="col" className="num">
              {t.males}
            </th>
            <th scope="col" className="num">
              {t.females}
            </th>
            <th scope="col" className="num">
              {t.juveniles}
            </th>
          </tr>
        </thead>
        <tbody>
          {totals.census.length === 0 && (
            <tr>
              <td colSpan={4}>{t.none}</td>
            </tr>
          )}
          {totals.census.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.name}</th>
              <td className="num">{r.males}</td>
              <td className="num">{r.females}</td>
              <td className="num">{r.juveniles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
