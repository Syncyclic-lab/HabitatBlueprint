/** Themed areas, the legend preview and the title block (docs/03 §4.4). */
import { en } from '../../i18n/en.ts';
import { OBJECT_TYPES, getSwatch } from '../../data/index.ts';
import { newId } from '../../model/factory.ts';
import type { Plan } from '../../model/types.ts';
import { addArea, deleteArea, updateArea, updatePlanDetails } from '../store/actions.ts';
import { usePlanner } from '../store/store.ts';
import { legendData } from '../legend.ts';
import { CheckField, SelectField, TextField } from '../ui/fields.tsx';
import { Icon } from '../ui/Icon.tsx';
import { silhouetteFor } from '../map/layers.tsx';

const t = en.planner.areas;

export function AreasPanel() {
  const plan = usePlanner((s) => s.plan);
  if (!plan) return null;
  const swatches = OBJECT_TYPES.areaPalette.swatches;
  return (
    <>
      <h2>{t.heading}</h2>
      <p className="field-help">{t.intro}</p>
      <section className="panel-section" aria-labelledby="areas-list">
        <h3 id="areas-list">{t.tab}</h3>
        {plan.areas.length === 0 && <p>{t.empty}</p>}
        {plan.areas.map((a) => {
          const count = plan.objects.filter((o) => o.areaId === a.id).length;
          const sw = getSwatch(a.swatchId);
          return (
            <fieldset key={a.id} className="area-card">
              <legend>
                <span className="swatch" aria-hidden="true" style={{ background: sw?.fill }} />{' '}
                {a.name} <span className="field-help">({t.members(count)})</span>
              </legend>
              <TextField
                label={t.name}
                value={a.name}
                maxLength={60}
                required
                onCommit={(v) => updateArea(a.id, { name: v.trim() })}
              />
              <SelectField
                label={t.swatch}
                value={a.swatchId}
                options={swatches.map((s) => ({ value: s.id, label: s.label }))}
                onChange={(v) => updateArea(a.id, { swatchId: v })}
              />
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={() => deleteArea(a.id)}
              >
                {t.delete(a.name)}
              </button>
            </fieldset>
          );
        })}
        <button
          type="button"
          className="btn btn-small"
          onClick={() =>
            addArea({
              id: newId(),
              name: t.newName(plan.areas.length + 1),
              swatchId: swatches[plan.areas.length % swatches.length]?.id ?? 'savanna',
            })
          }
        >
          <Icon id="plus" size={16} />
          {t.add}
        </button>
      </section>

      <section className="panel-section" aria-labelledby="title-block">
        <h3 id="title-block">{t.titleBlock}</h3>
        <TextField
          label={t.zooName}
          value={plan.name}
          maxLength={60}
          required
          onCommit={(v) =>
            updatePlanDetails((d) => {
              d.name = v.trim();
            })
          }
        />
        <TextField
          label={t.subtitle}
          value={plan.subtitle ?? ''}
          maxLength={120}
          onCommit={(v) =>
            updatePlanDetails((d) => {
              if (v.trim()) d.subtitle = v.trim();
              else delete d.subtitle;
            })
          }
        />
        <CheckField
          label={t.showLegend}
          checked={plan.titleBlock.showLegend}
          onChange={(v) =>
            updatePlanDetails((d) => {
              d.titleBlock.showLegend = v;
            })
          }
        />
        <CheckField
          label={t.showScale}
          checked={plan.titleBlock.showScale}
          onChange={(v) =>
            updatePlanDetails((d) => {
              d.titleBlock.showScale = v;
            })
          }
        />
        <CheckField
          label={t.showNorth}
          checked={plan.titleBlock.showNorth}
          onChange={(v) =>
            updatePlanDetails((d) => {
              d.titleBlock.showNorth = v;
            })
          }
        />
      </section>

      <section className="panel-section" aria-labelledby="legend-preview">
        <h3 id="legend-preview">{t.legend}</h3>
        <LegendPreview plan={plan} />
      </section>
    </>
  );
}

function LegendPreview({ plan }: { plan: Plan }) {
  const { blocks, services } = legendData(plan);
  if (blocks.length === 0 && services.length === 0) return <p>{t.noSpecies}</p>;
  return (
    <div className="legend-preview">
      {blocks.map((b) => {
        const sw = b.swatchId ? getSwatch(b.swatchId) : undefined;
        return (
          <section key={b.id || 'other'} className="legend-block" aria-label={b.name}>
            <h4 style={{ background: sw?.fill ?? '#DBB34D', color: sw?.ink ?? '#000000' }}>
              {b.name}
            </h4>
            <dl>
              {b.categories.map((c) => (
                <div key={c.category}>
                  <dt>{en.planner.legend.categories[c.category]}</dt>
                  <dd>
                    <ul role="list">
                      {c.species.map((s) => (
                        <li key={s.name} className="legend-item">
                          <Icon id={silhouetteFor(s.animal)} size={20} />
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
      {services.length > 0 && (
        <section className="legend-block" aria-label={t.guestServices}>
          <h4 style={{ background: '#EF7837', color: '#000000' }}>{t.guestServices}</h4>
          <ul role="list" className="legend-services">
            {services.map((id) => (
              <li key={id} className="legend-item">
                <Icon id={id} size={20} />
                {en.planner.facilities[id]}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
