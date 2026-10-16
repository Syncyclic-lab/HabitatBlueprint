import { useId, useState } from 'react';
import type { Draft } from 'immer';
import { en } from '../../i18n/en.ts';
import { SPECIES, getSpecies } from '../../data/index.ts';
import { SPECIES_CATEGORIES } from '../../data/schemas.ts';
import { newId } from '../../model/factory.ts';
import type { SpaceType } from '../../model/requirements.ts';
import type { SpeciesRequirement } from '../../model/types.ts';
import { deleteSpecies, upsertSpecies } from '../store/actions.ts';
import { setState, usePlanner } from '../store/store.ts';
import { CheckField, NumberField, SelectField, TextField } from '../ui/fields.tsx';
import { Dialog } from '../ui/Dialog.tsx';

const t = en.planner.species;
const SPACES: SpaceType[] = ['land', 'water', 'deepWater', 'climbing', 'flying'];

/**
 * The species library (docs/03 §4.6): space needs the user enters from the in-game Zoopedia.
 * The 136 species names come from data/species.json; the numbers never do (docs/10 §4).
 */
export function SpeciesDialog() {
  const plan = usePlanner((s) => s.plan);
  const [pick, setPick] = useState('');
  const pickId = useId();
  if (!plan) return null;
  const library = plan.speciesLibrary;

  const add = () => {
    const cat = pick ? getSpecies(pick) : undefined;
    const entry: SpeciesRequirement = {
      id: newId(),
      ...(cat ? { catalogId: cat.id } : {}),
      commonName: cat?.commonName ?? t.custom,
      kind: (cat?.kinds[0] ?? 'habitat') as SpeciesRequirement['kind'],
      category: cat?.category ?? 'Other',
      requirements: { land: null, water: null, deepWater: null, climbing: null, flying: null },
      includedInBase: 1,
      origin: 'user',
      verified: true,
    };
    upsertSpecies(entry);
    setPick('');
  };

  return (
    <Dialog
      title={t.title}
      onClose={() => setState({ dialog: null })}
      cancelLabel={en.planner.dialogs.done}
      wide
    >
      <p>{t.intro}</p>
      <p className="field-help">{t.formula}</p>
      <div className="field-row">
        <div className="field">
          <label htmlFor={pickId}>{t.fromCatalog}</label>
          <select id={pickId} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">{t.custom}</option>
            {SPECIES.species
              .filter((s) => !library.some((l) => l.catalogId === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.commonName}
                </option>
              ))}
          </select>
        </div>
        <div className="field add-species">
          <button type="button" className="btn" onClick={add}>
            {t.add}
          </button>
        </div>
      </div>
      <p>{library.length === 0 ? t.empty : t.entries(library.length)}</p>
      {library.map((s) => (
        <SpeciesEditor key={s.id} entry={s} />
      ))}
    </Dialog>
  );
}

function SpeciesEditor({ entry }: { entry: SpeciesRequirement }) {
  const save = (recipe: (d: Draft<SpeciesRequirement>) => void) => {
    const copy = structuredClone(entry) as SpeciesRequirement;
    recipe(copy as Draft<SpeciesRequirement>);
    upsertSpecies(copy);
  };
  return (
    <fieldset className="species-card">
      <legend>{entry.commonName}</legend>
      <div className="field-row">
        <TextField
          label={t.name}
          value={entry.commonName}
          maxLength={60}
          required
          onCommit={(v) => save((d) => void (d.commonName = v.trim()))}
        />
        <SelectField
          label={t.kind}
          value={entry.kind}
          options={(['habitat', 'aviary', 'aquarium', 'exhibit'] as const).map((k) => ({
            value: k,
            label: en.planner.habitatKinds[k],
          }))}
          onChange={(v) => save((d) => void (d.kind = v))}
        />
        <SelectField
          label={t.category}
          value={entry.category}
          options={SPECIES_CATEGORIES.map((c) => ({
            value: c,
            label: en.planner.legend.categories[c],
          }))}
          onChange={(v) => save((d) => void (d.category = v))}
        />
      </div>
      <p className="field-help">{t.optional}</p>
      <div className="species-grid">
        {SPACES.map((space) => {
          const req = entry.requirements[space];
          return (
            <div key={space} className="field-row">
              <NumberField
                label={t.base(t.spaces[space])}
                value={req?.baseM2 ?? 0}
                min={0}
                max={1e7}
                digits={0}
                onCommit={(v) =>
                  save((d) => {
                    d.requirements[space] =
                      v > 0 || (req?.perExtraM2 ?? 0) > 0
                        ? { baseM2: v, perExtraM2: req?.perExtraM2 ?? 0 }
                        : null;
                  })
                }
              />
              <NumberField
                label={t.extra(t.spaces[space])}
                value={req?.perExtraM2 ?? 0}
                min={0}
                max={1e7}
                digits={0}
                onCommit={(v) =>
                  save((d) => {
                    d.requirements[space] =
                      v > 0 || (req?.baseM2 ?? 0) > 0
                        ? { baseM2: req?.baseM2 ?? 0, perExtraM2: v }
                        : null;
                  })
                }
              />
            </div>
          );
        })}
      </div>
      <div className="field-row">
        <NumberField
          label={t.includedInBase}
          help={t.includedHelp}
          value={entry.includedInBase}
          min={1}
          max={999}
          digits={0}
          onCommit={(v) => save((d) => void (d.includedInBase = Math.round(v)))}
        />
        <NumberField
          label={t.barrierGrade}
          value={entry.barrierGrade ?? 0}
          min={0}
          max={6}
          digits={0}
          onCommit={(v) =>
            save((d) => {
              if (v >= 1) d.barrierGrade = Math.round(v);
              else delete d.barrierGrade;
            })
          }
        />
      </div>
      <CheckField
        label={t.verified}
        checked={entry.verified}
        onChange={(v) => save((d) => void (d.verified = v))}
      />
      <button
        type="button"
        className="btn btn-small btn-danger"
        onClick={() => deleteSpecies(entry.id)}
      >
        {t.remove(entry.commonName)}
      </button>
    </fieldset>
  );
}
