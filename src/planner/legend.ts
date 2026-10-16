/** Legend content in the reference poster's structure: area blocks → categories → species. */
import { en } from '../i18n/en.ts';
import { getSpecies } from '../data/index.ts';
import type { SpeciesCategory } from '../data/schemas.ts';
import { FACILITY_ICON_IDS, type FacilityIconId } from '../assets/icons/icons.ts';
import type { AnimalEntry, Plan } from '../model/types.ts';
import { animalName } from './describe.ts';

const CATEGORY_ORDER: SpeciesCategory[] = [
  'Herbivores',
  'Predators',
  'Primates',
  'Birds',
  'Reptiles',
  'Amphibians',
  'Fish',
  'Invertebrates',
  'Other',
];

export interface LegendBlock {
  id: string;
  name: string;
  swatchId: string;
  categories: { category: SpeciesCategory; species: { name: string; animal: AnimalEntry }[] }[];
}

export interface LegendData {
  blocks: LegendBlock[];
  services: FacilityIconId[];
}

export function legendData(plan: Plan): LegendData {
  const areas = [
    ...plan.areas.map((a) => ({ id: a.id, name: a.name, swatchId: a.swatchId })),
    { id: '', name: en.planner.areas.unassignedArea, swatchId: '' },
  ];
  const known = new Set(plan.areas.map((a) => a.id));
  const blocks = areas
    .map((area): LegendBlock => {
      const byCat = new Map<SpeciesCategory, { name: string; animal: AnimalEntry }[]>();
      for (const o of plan.objects) {
        if (o.type !== 'habitat') continue;
        const inArea = area.id ? o.areaId === area.id : !o.areaId || !known.has(o.areaId);
        if (!inArea) continue;
        for (const a of o.animals) {
          const cat = (a.catalogId && getSpecies(a.catalogId)?.category) || 'Other';
          const list = byCat.get(cat) ?? [];
          const name = animalName(a);
          if (!list.some((x) => x.name === name)) list.push({ name, animal: a });
          byCat.set(cat, list);
        }
      }
      return {
        ...area,
        categories: CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
          category: c,
          species: (byCat.get(c) ?? []).sort((x, y) => x.name.localeCompare(y.name)),
        })),
      };
    })
    .filter((b) => b.categories.length > 0);
  const services = FACILITY_ICON_IDS.filter((id) =>
    plan.objects.some((o) => o.type === 'icon' && o.iconId === id),
  );
  return { blocks, services };
}
