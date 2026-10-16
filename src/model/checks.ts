/**
 * Plan checks (docs/03 §4.7). Checks inform; they never block saving or exporting.
 */
import { intersect, clipToMap, GeometryError } from '../geometry/clip.ts';
import type { BBox, MultiPoly } from '../geometry/types.ts';
import { bboxOfMulti, bboxesOverlap, multiArea } from '../geometry/polygon.ts';
import { getBarrier, getSpecies } from '../data/index.ts';
import { checkHabitat, findRequirement } from './requirements.ts';
import { footprint, habitatMeasure } from './totals.ts';
import type { HabitatObject, Id, Plan } from './types.ts';

export type CheckKind =
  'overlap' | 'short' | 'noAnimals' | 'wrongEnclosure' | 'outsideMap' | 'lowBarrier';

export interface PlanCheck {
  kind: CheckKind;
  objectIds: Id[];
  /** Extra numbers for the message: square meters short, barrier grades, … */
  data: Record<string, number | string>;
}

/** Overlaps smaller than this (m²) are shared walls, not real overlaps. */
const OVERLAP_SLACK_M2 = 0.5;

export function runChecks(plan: Plan): PlanCheck[] {
  const out: PlanCheck[] = [];
  const { mapWidthM: w, mapHeightM: h, requirementBufferPct } = plan.settings;
  const mapM2 = w * h;
  const habitats = plan.objects.filter((o): o is HabitatObject => o.type === 'habitat');

  // Habitats overlapping each other.
  const prints = habitats.map((hab) => footprint(hab) ?? []);
  const boxes = prints.map(bboxOfMulti);
  for (let i = 0; i < habitats.length; i++) {
    for (let j = i + 1; j < habitats.length; j++) {
      const a = habitats[i] as HabitatObject;
      const b = habitats[j] as HabitatObject;
      const fa = prints[i] as MultiPoly;
      const fb = prints[j] as MultiPoly;
      if (!bboxesOverlap(boxes[i] as BBox, boxes[j] as BBox)) continue;
      try {
        const overlap = multiArea(intersect(fa, fb));
        if (overlap > OVERLAP_SLACK_M2) {
          out.push({ kind: 'overlap', objectIds: [a.id, b.id], data: { m2: overlap } });
        }
      } catch (error) {
        if (!(error instanceof GeometryError)) throw error;
      }
    }
  }

  for (const hab of habitats) {
    const measure = habitatMeasure(hab, mapM2);
    const check = checkHabitat(hab, measure, plan.speciesLibrary, requirementBufferPct);
    if (check.status === 'noAnimals')
      out.push({ kind: 'noAnimals', objectIds: [hab.id], data: {} });
    if (check.status === 'short')
      out.push({ kind: 'short', objectIds: [hab.id], data: { m2: check.shortM2 } });

    for (const animal of hab.animals) {
      const species = animal.catalogId ? getSpecies(animal.catalogId) : undefined;
      if (species && !species.kinds.includes(hab.kind)) {
        out.push({
          kind: 'wrongEnclosure',
          objectIds: [hab.id],
          data: { species: species.commonName, needs: species.kinds.join(', ') },
        });
      }
      const req = findRequirement(animal, plan.speciesLibrary);
      const have = hab.barrier ? (getBarrier(hab.barrier.barrierId)?.grade ?? 0) : 0;
      if (req?.barrierGrade && hab.barrier && have < req.barrierGrade) {
        out.push({
          kind: 'lowBarrier',
          objectIds: [hab.id],
          data: { species: req.commonName, have, need: req.barrierGrade },
        });
      }
    }
  }

  // Anything partly outside the map (defensive: the tools clamp to the map).
  for (const o of plan.objects) {
    const fp = footprint(o);
    if (!fp) continue;
    try {
      const inside = multiArea(clipToMap(fp, w, h));
      if (multiArea(fp) - inside > 0.01)
        out.push({ kind: 'outsideMap', objectIds: [o.id], data: {} });
    } catch (error) {
      if (!(error instanceof GeometryError)) throw error;
    }
  }
  return out;
}
