import { en } from '../../i18n/en.ts';
import { getBuildingType } from '../../data/index.ts';
import type { Shape, Vec2 } from '../../geometry/types.ts';
import { shapeFromArea } from '../../geometry/resize.ts';
import { formatArea } from '../../lib/format.ts';
import { newId, nextName } from '../../model/factory.ts';
import { objectsBBox, translateObject } from '../../model/objectGeometry.ts';
import type { MapObject, Plan } from '../../model/types.ts';
import { announce } from '../a11y/announcer.ts';
import { addObjects } from '../store/actions.ts';
import { getState, setState } from '../store/store.ts';
import { revealBox } from '../store/view.ts';
import { Dialog } from '../ui/Dialog.tsx';

const t = en.planner.templates;

type Builder = (plan: Plan, c: Vec2) => MapObject[];

const base = (plan: Plan, prefix: string, taken: MapObject[]) => ({
  id: newId(),
  name: nextName([...plan.objects, ...taken], prefix),
  phase: 1,
  locked: false,
  hidden: false,
});

/** The data file's label for a building type, so names match the Building tool. */
const buildingName = (id: string): string =>
  getBuildingType(id)?.label ?? en.planner.types.building;

const circle = (c: Vec2, r: number): Shape => ({
  kind: 'ellipse',
  cx: c.x,
  cy: c.y,
  rx: r,
  ry: r,
  rotationDeg: 0,
});
const rect = (x: number, y: number, w: number, h: number, cornerRadiusM?: number): Shape => ({
  kind: 'rect',
  x,
  y,
  w,
  h,
  rotationDeg: 0,
  ...(cornerRadiusM ? { cornerRadiusM } : {}),
});

const roundabout: Builder = (plan, c) => {
  const out: MapObject[] = [];
  out.push({ ...base(plan, en.planner.types.plaza, out), type: 'plaza', shape: circle(c, 22) });
  out.push({
    ...base(plan, en.planner.types.water, out),
    type: 'water',
    deep: false,
    shape: circle(c, 9),
  });
  out.push({
    ...base(plan, en.planner.facilities.fountain, out),
    type: 'icon',
    iconId: 'fountain',
    at: c,
    sizing: 'map',
    sizeM: 8,
    rotationDeg: 0,
  });
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    out.push({
      ...base(plan, en.planner.types.path, out),
      type: 'path',
      pathType: 'guest',
      widthM: 6,
      cap: 'flat',
      line: {
        points: [
          { x: c.x + dx * 21, y: c.y + dy * 21 },
          { x: c.x + dx * 60, y: c.y + dy * 60 },
        ],
        smooth: false,
      },
    });
  }
  return out;
};

const entrance: Builder = (plan, c) => {
  const out: MapObject[] = [];
  out.push({
    ...base(plan, en.planner.types.plaza, out),
    type: 'plaza',
    shape: rect(c.x - 40, c.y - 25, 80, 50, 6),
  });
  out.push({
    ...base(plan, buildingName('entrance'), out),
    type: 'building',
    buildingType: 'entrance',
    shape: rect(c.x - 15, c.y + 25, 30, 12),
  });
  out.push({
    ...base(plan, buildingName('restrooms'), out),
    type: 'building',
    buildingType: 'restrooms',
    shape: rect(c.x - 40, c.y + 25, 14, 10),
  });
  out.push({
    ...base(plan, buildingName('information'), out),
    type: 'building',
    buildingType: 'information',
    shape: rect(c.x + 26, c.y + 25, 14, 10),
  });
  out.push({
    ...base(plan, en.planner.facilities.ticket, out),
    type: 'icon',
    iconId: 'ticket',
    at: { x: c.x, y: c.y + 10 },
    sizing: 'screen',
    sizeM: 6,
    rotationDeg: 0,
  });
  return out;
};

const exhibitHouse: Builder = (plan, c) => {
  const out: MapObject[] = [];
  out.push({
    ...base(plan, buildingName('animal-house'), out),
    type: 'building',
    buildingType: 'animal-house',
    shape: rect(c.x - 33, c.y - 22, 66, 44),
  });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      out.push({
        ...base(plan, en.planner.habitatKinds.exhibit, out),
        type: 'habitat',
        kind: 'exhibit',
        zones: [],
        animals: [],
        shape: rect(c.x - 30 + col * 20, c.y - 19 + row * 22, 18, 16),
      });
    }
  }
  return out;
};

const squareHabitat =
  (area: number): Builder =>
  (plan, c) => {
    const out: MapObject[] = [];
    const shape = shapeFromArea({ kind: 'rect', areaM2: area, aspect: 1, center: c });
    const side = Math.sqrt(area);
    out.push({
      ...base(plan, en.planner.habitatKinds.habitat, out),
      type: 'habitat',
      kind: 'habitat',
      animals: [],
      shape,
      zones: [
        {
          id: newId(),
          kind: 'water',
          shape: circle({ x: c.x + side * 0.2, y: c.y + side * 0.2 }, side * 0.12),
        },
      ],
    });
    return out;
  };

const TEMPLATES: { id: string; name: string; desc: string; build: Builder }[] = [
  { id: 'roundabout', name: t.roundabout, desc: t.roundaboutDesc, build: roundabout },
  { id: 'entrance', name: t.entrance, desc: t.entranceDesc, build: entrance },
  { id: 'house', name: t.exhibitHouse, desc: t.exhibitHouseDesc, build: exhibitHouse },
  ...[1000, 2500, 5000].map((a) => ({
    id: `square-${a}`,
    name: t.standard(formatArea(a)),
    desc: t.standardDesc,
    build: squareHabitat(a),
  })),
];

/** Starter templates (docs/03 §3.12), inserted at the centre of the view. */
export function TemplatesDialog() {
  const insert = (tpl: (typeof TEMPLATES)[number]) => {
    const s = getState();
    const plan = s.plan;
    if (!plan) return;
    let objs = tpl.build(plan, { x: s.view.cx, y: s.view.cy });
    // Keep it on the map.
    const box = objectsBBox(objs);
    if (box) {
      const dx = Math.min(0, plan.settings.mapWidthM - box.maxX) + Math.max(0, -box.minX);
      const dy = Math.min(0, plan.settings.mapHeightM - box.maxY) + Math.max(0, -box.minY);
      if (dx || dy) objs = objs.map((o) => translateObject(o, dx, dy));
    }
    addObjects(objs, en.planner.history.template(tpl.name));
    setState({ dialog: null });
    const after = objectsBBox(objs);
    if (after) revealBox(after);
    announce(t.inserted(tpl.name));
  };
  return (
    <Dialog title={t.title} onClose={() => setState({ dialog: null })} wide>
      <p>{t.intro}</p>
      <ul className="template-list" role="list">
        {TEMPLATES.map((tpl) => (
          <li key={tpl.id} className="template-item">
            <div>
              <strong>{tpl.name}</strong>
              <p className="field-help">{tpl.desc}</p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => insert(tpl)}
              aria-label={`${t.insert}: ${tpl.name}`}
            >
              {t.insert}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
