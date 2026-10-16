import { useMemo, useState } from 'react';
import { ComboBox, Input, Label, ListBox, ListBoxItem, Popover, Text } from 'react-aria-components';
import { en } from '../../i18n/en.ts';
import { SPECIES } from '../../data/index.ts';
import { formatArea } from '../../lib/format.ts';
import { checkHabitat } from '../../model/requirements.ts';
import { habitatMeasure } from '../../model/totals.ts';
import type { HabitatObject, Plan } from '../../model/types.ts';
import { animalName } from '../describe.ts';
import { addAnimal, removeAnimal, updateAnimal } from '../store/actions.ts';
import { setState } from '../store/store.ts';
import { NumberField } from '../ui/fields.tsx';
import { Icon } from '../ui/Icon.tsx';

const t = en.planner.inspector;

/** Animals in a habitat: species, ♂/♀/juvenile counts and the space check (docs/03 §4.3). */
export function AnimalsSection({ habitat, plan }: { habitat: HabitatObject; plan: Plan }) {
  const units = plan.settings.units;
  const mapM2 = plan.settings.mapWidthM * plan.settings.mapHeightM;
  const check = useMemo(
    () =>
      checkHabitat(
        habitat,
        habitatMeasure(habitat, mapM2),
        plan.speciesLibrary,
        plan.settings.requirementBufferPct,
      ),
    [habitat, mapM2, plan.speciesLibrary, plan.settings.requirementBufferPct],
  );
  return (
    <section className="panel-section" aria-labelledby="insp-animals">
      <h3 id="insp-animals">{t.animalsHeading}</h3>
      {habitat.animals.length === 0 && <p className="field-help">{t.noAnimals}</p>}
      {habitat.animals.map((a) => {
        const name = animalName(a);
        const sc = check.species.find((s) => s.animal.id === a.id);
        return (
          <fieldset key={a.id} className="animal-card">
            <legend>{name}</legend>
            <div className="field-row field-row-3">
              <NumberField
                label={t.males}
                value={a.males}
                min={0}
                max={999}
                digits={0}
                disabled={habitat.locked}
                onCommit={(v) => updateAnimal(habitat.id, a.id, { males: Math.round(v) })}
              />
              <NumberField
                label={t.females}
                value={a.females}
                min={0}
                max={999}
                digits={0}
                disabled={habitat.locked}
                onCommit={(v) => updateAnimal(habitat.id, a.id, { females: Math.round(v) })}
              />
              <NumberField
                label={t.juveniles}
                value={a.juveniles}
                min={0}
                max={999}
                digits={0}
                disabled={habitat.locked}
                onCommit={(v) => updateAnimal(habitat.id, a.id, { juveniles: Math.round(v) })}
              />
            </div>
            {sc && (
              <div className="requirement">
                <span className="status-pill" data-status={sc.status}>
                  <Icon
                    id={sc.status === 'fits' ? 'check' : sc.status === 'short' ? 'warning' : 'info'}
                    size={16}
                  />
                  {sc.status === 'fits'
                    ? t.requirementFits
                    : sc.status === 'short'
                      ? t.requirementShort(
                          formatArea(Math.max(...sc.rows.map((r) => r.shortM2)), units),
                        )
                      : t.requirementNoData}
                </span>
                {sc.rows.length > 0 && (
                  <ul className="requirement-rows">
                    {sc.rows.map((r) => (
                      <li key={r.space}>
                        {t.requiredRow(
                          en.planner.species.spaces[r.space],
                          formatArea(r.requiredM2, units),
                          formatArea(r.availableM2, units),
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {sc.status === 'noData' && (
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => setState({ dialog: { id: 'species' } })}
                  >
                    {t.enterNeeds(name)}
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              className="btn btn-small btn-quiet"
              disabled={habitat.locked}
              onClick={() => removeAnimal(habitat.id, a.id)}
            >
              {t.removeAnimals(name)}
            </button>
          </fieldset>
        );
      })}
      {!habitat.locked && <AddAnimal habitat={habitat} />}
    </section>
  );
}

/** Species picker: all 136 Planet Zoo 2 species first, sorted to suit the habitat kind; any name allowed. */
function AddAnimal({ habitat }: { habitat: HabitatObject }) {
  const [text, setText] = useState('');
  const items = useMemo(
    () =>
      [...SPECIES.species]
        .sort((a, b) => {
          const fa = (a.kinds as string[]).includes(habitat.kind) ? 0 : 1;
          const fb = (b.kinds as string[]).includes(habitat.kind) ? 0 : 1;
          return fa - fb || a.commonName.localeCompare(b.commonName);
        })
        .map((s) => ({ id: s.id, name: s.commonName })),
    [habitat.kind],
  );
  const add = (catalogId: string | null, displayName: string) => {
    const name = displayName.trim();
    if (!name) return;
    addAnimal(habitat.id, {
      ...(catalogId ? { catalogId } : {}),
      displayName: name,
      males: 1,
      females: 1,
      juveniles: 0,
    });
    setText('');
  };
  return (
    <div className="add-animal">
      <ComboBox
        className="field"
        inputValue={text}
        onInputChange={setText}
        allowsCustomValue
        menuTrigger="focus"
        onSelectionChange={(key) => {
          if (key === null) return;
          const s = items.find((i) => i.id === key);
          if (s) add(s.id, s.name);
        }}
        defaultItems={items}
      >
        <Label>{t.species}</Label>
        <Input
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              text.trim() &&
              !items.some((i) => i.name.toLowerCase() === text.trim().toLowerCase())
            ) {
              add(null, text);
            }
          }}
        />
        <Text slot="description" className="field-help">
          {t.speciesHint}
        </Text>
        <Popover className="pl-popover" placement="bottom start">
          <ListBox className="pl-menu">
            {(item: { id: string; name: string }) => (
              <ListBoxItem id={item.id} className="pl-menu-item" textValue={item.name}>
                {item.name}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </ComboBox>
      <button
        type="button"
        className="btn btn-small"
        disabled={!text.trim()}
        onClick={() => {
          const match = items.find((i) => i.name.toLowerCase() === text.trim().toLowerCase());
          add(match?.id ?? null, match?.name ?? text);
        }}
      >
        <Icon id="plus" size={16} />
        {t.addAnimals}
      </button>
    </div>
  );
}
