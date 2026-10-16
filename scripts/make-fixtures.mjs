#!/usr/bin/env node
/**
 * Writes the test plan files in tests/fixtures/ (docs/12 "Fixtures"). The output is
 * deterministic (seeded), so re-running it only changes the files when this script changes.
 *   node scripts/make-fixtures.mjs
 * Map size comes from data/maps.json, like the app.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'tests', 'fixtures');
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const maps = readJson('data/maps.json');
const biomes = readJson('data/biomes.json');
const species = readJson('data/species.json');
const siteTs = readFileSync(join(root, 'src/config/site.ts'), 'utf8');
const constant = (name) => {
  const m = siteTs.match(new RegExp(`export const ${name} = '([^']+)'`));
  if (!m) throw new Error(`${name} not found in src/config/site.ts`);
  return m[1];
};

const preset = maps.presets.find((p) => p.id === maps.defaultPresetId) ?? maps.presets[0];
const W = preset.widthM;
const H = preset.heightM;
const biome = biomes.biomes.find((b) => b.isDefault) ?? biomes.biomes[0];
const speciesIds = (species.species ?? species).map((s) => s.id);
const STAMP = '2026-10-15T00:00:00.000Z';

// Small seeded PRNG (mulberry32) so fixtures are stable.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n) => Math.round(n * 100) / 100;
const pt = (x, y) => ({ x: r2(Math.min(Math.max(x, 0), W)), y: r2(Math.min(Math.max(y, 0), H)) });

function settings() {
  return {
    mapPresetId: preset.id,
    mapWidthM: W,
    mapHeightM: H,
    mode: 'sandbox',
    biomeId: biome.id,
    units: 'metric',
    grid: { visible: true, minorM: 5, majorEvery: 10 },
    snap: {
      enabled: true,
      grid: true,
      vertices: true,
      edges: true,
      angleStepDeg: 15,
      guides: false,
    },
    display: { showAreasOnMap: true, style: 'clear', patterns: true },
    requirementBufferPct: 10,
  };
}

function planFile(id, name, objects, areas = []) {
  return {
    format: constant('PLAN_FILE_FORMAT'),
    formatVersion: 1,
    exportedAt: STAMP,
    app: { name: constant('SITE_NAME'), version: constant('APP_VERSION') },
    plan: {
      schemaVersion: 1,
      id,
      name,
      createdAt: STAMP,
      updatedAt: STAMP,
      settings: settings(),
      areas,
      objects,
      speciesLibrary: [],
      titleBlock: { showLegend: true, showScale: true, showNorth: true },
      snapshots: [],
    },
  };
}

/** Builds objects with sequential ids and names ("Habitat 3"). */
function builder() {
  const objects = [];
  const counts = new Map();
  const base = (prefix, extra = {}) => {
    const n = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, n);
    return {
      id: `o-${String(objects.length + 1).padStart(4, '0')}`,
      name: `${prefix} ${n}`,
      phase: 1,
      locked: false,
      hidden: false,
      ...extra,
    };
  };
  const add = (o) => {
    objects.push(o);
    return o;
  };
  return { objects, base, add };
}

/** An irregular polygon around a centre: a "blob" habitat. */
function blob(rand, cx, cy, rx, ry, n = 7) {
  const points = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.75 + rand() * 0.25;
    points.push(pt(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k));
  }
  return { kind: 'polygon', points };
}

function habitat(b, rand, shape, i, zoneShape) {
  const animals = [];
  if (i % 2 === 0) {
    const sp = speciesIds[(i * 7) % speciesIds.length];
    animals.push({
      id: `a-${i}`,
      catalogId: sp,
      displayName: sp,
      males: 1 + (i % 3),
      females: 2 + (i % 4),
      juveniles: i % 2,
    });
  }
  return b.add({
    ...b.base('Habitat'),
    type: 'habitat',
    kind: i % 9 === 4 ? 'aviary' : 'habitat',
    shape,
    zones: zoneShape
      ? [{ id: `z-${i}`, kind: i % 3 === 0 ? 'deepWater' : 'water', shape: zoneShape }]
      : [],
    animals,
  });
}

// ───────── crystal-ridge-like: ~150 objects arranged like a finished park ─────────

function crystalRidge() {
  const rand = rng(1842);
  const b = builder();
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.3;
  const areas = [
    { id: 'area-north', name: 'Northern trail', swatchId: 'forest' },
    { id: 'area-south', name: 'Savannah loop', swatchId: 'savanna' },
  ];

  // Main loop path (closed ring drawn as an open polyline that returns to its start).
  const loop = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    loop.push(pt(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8));
  }
  b.add({
    ...b.base('Guest path'),
    type: 'path',
    pathType: 'guest',
    line: { points: loop, smooth: true },
    widthM: 6,
    cap: 'round',
  });

  // Entrance plaza and spokes.
  b.add({
    ...b.base('Plaza'),
    type: 'plaza',
    shape: {
      kind: 'rect',
      x: r2(cx - 40),
      y: r2(cy + R * 0.8 + 10),
      w: 80,
      h: 40,
      rotationDeg: 0,
      cornerRadiusM: 6,
    },
  });
  b.add({
    ...b.base('Entrance'),
    type: 'building',
    buildingType: 'entrance',
    shape: { kind: 'rect', x: r2(cx - 15), y: r2(cy + R * 0.8 + 50), w: 30, h: 12, rotationDeg: 0 },
  });
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * Math.PI * 2 + 0.3;
    const p1 = pt(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8);
    const p2 = pt(cx + Math.cos(a) * R * 0.35, cy + Math.sin(a) * R * 0.28);
    b.add({
      ...b.base('Guest path'),
      type: 'path',
      pathType: s % 3 === 2 ? 'staff' : 'guest',
      line: { points: [p1, p2], smooth: false },
      widthM: s % 3 === 2 ? 4 : 5,
      cap: 'flat',
    });
  }
  b.add({
    ...b.base('Plaza'),
    type: 'plaza',
    shape: { kind: 'ellipse', cx: r2(cx), cy: r2(cy), rx: 30, ry: 30, rotationDeg: 0 },
  });
  b.add({
    ...b.base('Water'),
    type: 'water',
    deep: false,
    shape: { kind: 'ellipse', cx: r2(cx), cy: r2(cy), rx: 12, ry: 12, rotationDeg: 0 },
  });

  // Habitats: an outer ring and an inner ring.
  let h = 0;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const hx = cx + Math.cos(a) * (R + 70);
    const hy = cy + Math.sin(a) * (R * 0.8 + 60);
    const shape =
      i % 3 === 0
        ? {
            kind: 'rect',
            x: r2(hx - 35),
            y: r2(hy - 25),
            w: 70,
            h: 50,
            rotationDeg: r2((a * 180) / Math.PI) % 90,
          }
        : i % 3 === 1
          ? blob(rand, hx, hy, 45, 35)
          : { kind: 'ellipse', cx: r2(hx), cy: r2(hy), rx: 38, ry: 28, rotationDeg: 0 };
    const zone =
      i % 2 === 0
        ? { kind: 'ellipse', cx: r2(hx), cy: r2(hy), rx: 8, ry: 6, rotationDeg: 0 }
        : null;
    const o = habitat(b, rand, shape, h++, zone);
    o.areaId = a < Math.PI ? 'area-south' : 'area-north';
    o.barrier = { barrierId: 'hedge' };
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26;
    const hx = cx + Math.cos(a) * (R - 50);
    const hy = cy + Math.sin(a) * (R * 0.8 - 40);
    habitat(
      b,
      rand,
      blob(rand, hx, hy, 28, 22, 6),
      h++,
      i % 3 === 0
        ? { kind: 'rect', x: r2(hx - 5), y: r2(hy - 4), w: 10, h: 8, rotationDeg: 0 }
        : null,
    );
  }

  // Buildings beside the loop.
  const kinds = [
    'restrooms',
    'food',
    'drinks',
    'shop',
    'information',
    'staff',
    'research',
    'vet',
    'guest-building',
    'animal-house',
  ];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.15;
    const bx = cx + Math.cos(a) * (R + 16);
    const by = cy + Math.sin(a) * (R * 0.8 + 14);
    b.add({
      ...b.base('Building'),
      type: 'building',
      buildingType: kinds[i % kinds.length],
      shape: {
        kind: 'rect',
        x: r2(bx - 7),
        y: r2(by - 5),
        w: 14,
        h: 10,
        rotationDeg: r2(((a * 180) / Math.PI) % 360),
      },
    });
  }

  // Water, planting, barriers, icons, labels, measures.
  for (let i = 0; i < 8; i++)
    b.add({
      ...b.base('Water'),
      type: 'water',
      deep: i % 2 === 1,
      shape: blob(rand, 80 + rand() * (W - 160), 60 + rand() * 120, 30, 20),
    });
  for (let i = 0; i < 16; i++)
    b.add({
      ...b.base('Planting'),
      type: 'planting',
      shape: blob(rand, 60 + rand() * (W - 120), H - 60 - rand() * 120, 22, 16, 6),
    });
  for (let i = 0; i < 6; i++)
    b.add({
      ...b.base('Plaza'),
      type: 'plaza',
      shape: {
        kind: 'rect',
        x: r2(100 + i * ((W - 260) / 6)),
        y: r2(H * 0.12),
        w: 26,
        h: 18,
        rotationDeg: 0,
        cornerRadiusM: 3,
      },
    });
  const barriers = ['hedge', 'fabric-netting'];
  for (let i = 0; i < 10; i++) {
    const x = 40 + i * ((W - 80) / 10);
    b.add({
      ...b.base('Barrier'),
      type: 'barrier',
      barrierId: barriers[i % 2],
      line: { points: [pt(x, H - 30), pt(x + 30, H - 40), pt(x + 60, H - 30)], smooth: false },
    });
  }
  const icons = [
    'restroom',
    'food',
    'drink',
    'gift',
    'info',
    'first-aid',
    'bench',
    'photo',
    'trash',
    'viewing',
    'education',
    'tree',
  ];
  for (let i = 0; i < 39; i++) {
    const a = (i / 39) * Math.PI * 2 + 0.05;
    b.add({
      ...b.base('Icon'),
      type: 'icon',
      iconId: icons[i % icons.length],
      at: pt(cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R * 0.8 - 8)),
      sizing: 'screen',
      sizeM: 6,
      rotationDeg: 0,
    });
  }
  const labels = [
    'North trail',
    'Savannah loop',
    'Lake',
    'Staff yard',
    'Entrance',
    'Aviary walk',
    'Nocturnal house',
    'Kids zone',
  ];
  for (let i = 0; i < 8; i++) {
    const text = labels[i];
    b.add({
      ...b.base('Label'),
      name: text,
      type: 'label',
      text,
      at: pt(cx + Math.cos(i) * R * 1.4, cy + Math.sin(i) * R * 1.1),
      sizing: 'screen',
      size: 16,
      rotationDeg: 0,
    });
  }
  b.add({
    ...b.base('Measure'),
    type: 'measure',
    mode: 'distance',
    points: [pt(cx - R, cy), pt(cx + R, cy)],
  });
  b.add({
    ...b.base('Measure'),
    type: 'measure',
    mode: 'area',
    points: [pt(20, 20), pt(80, 20), pt(80, 60), pt(20, 60)],
  });
  return planFile('fixture-crystal-ridge', 'Crystal Ridge (test)', b.objects, areas);
}

// ───────── stress-500: a dense grid of every object type ─────────

function stress500() {
  const rand = rng(500);
  const b = builder();
  const cols = 25;
  const rows = 20;
  const cw = W / cols;
  const ch = H / rows;
  let h = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw / 2;
      const y = r * ch + ch / 2;
      const k = (r * cols + c) % 10;
      const s = Math.min(cw, ch) * 0.4;
      if (k <= 3)
        habitat(
          b,
          rand,
          k === 0
            ? {
                kind: 'rect',
                x: r2(x - s),
                y: r2(y - s * 0.8),
                w: r2(s * 2),
                h: r2(s * 1.6),
                rotationDeg: 0,
              }
            : k === 1
              ? blob(rand, x, y, s, s * 0.8, 8)
              : {
                  kind: 'ellipse',
                  cx: r2(x),
                  cy: r2(y),
                  rx: r2(s),
                  ry: r2(s * 0.7),
                  rotationDeg: 15,
                },
          h++,
          k === 2
            ? {
                kind: 'ellipse',
                cx: r2(x),
                cy: r2(y),
                rx: r2(s * 0.3),
                ry: r2(s * 0.2),
                rotationDeg: 0,
              }
            : null,
        );
      else if (k === 4)
        b.add({
          ...b.base('Building'),
          type: 'building',
          buildingType: 'food',
          shape: {
            kind: 'rect',
            x: r2(x - s * 0.5),
            y: r2(y - s * 0.4),
            w: r2(s),
            h: r2(s * 0.8),
            rotationDeg: 10,
          },
        });
      else if (k === 5)
        b.add({
          ...b.base('Guest path'),
          type: 'path',
          pathType: 'guest',
          line: { points: [pt(x - s, y), pt(x, y - s * 0.5), pt(x + s, y)], smooth: true },
          widthM: 4,
          cap: 'round',
        });
      else if (k === 6)
        b.add({
          ...b.base('Water'),
          type: 'water',
          deep: false,
          shape: blob(rand, x, y, s * 0.8, s * 0.6),
        });
      else if (k === 7)
        b.add({
          ...b.base('Planting'),
          type: 'planting',
          shape: blob(rand, x, y, s * 0.7, s * 0.7, 6),
        });
      else if (k === 8)
        b.add({
          ...b.base('Barrier'),
          type: 'barrier',
          barrierId: 'hedge',
          line: { points: [pt(x - s, y + s * 0.5), pt(x + s, y + s * 0.5)], smooth: false },
        });
      else
        b.add({
          ...b.base('Icon'),
          type: 'icon',
          iconId: 'bench',
          at: pt(x, y),
          sizing: 'screen',
          sizeM: 6,
          rotationDeg: 0,
        });
    }
  }
  return planFile('fixture-stress-500', 'Stress 500 (test)', b.objects);
}

// ───────── hostile inputs (each must be rejected on import) ─────────

function hostile() {
  const good = planFile('fixture-hostile', 'Hostile', [
    {
      id: 'h1',
      name: 'Habitat 1',
      phase: 1,
      locked: false,
      hidden: false,
      type: 'habitat',
      kind: 'habitat',
      shape: { kind: 'rect', x: 10, y: 10, w: 20, h: 20, rotationDeg: 0 },
      zones: [],
      animals: [],
    },
  ]);
  const clone = () => JSON.parse(JSON.stringify(good));
  const files = {};

  const unknownKey = clone();
  unknownKey.plan.objects[0].onclick = 'alert(1)';
  files['unknown-key.json'] = JSON.stringify(unknownKey);

  // __proto__ written as a literal JSON key (JSON.stringify would drop it).
  files['prototype-pollution.json'] = JSON.stringify(good).replace(
    '"settings":',
    '"__proto__":{"polluted":true},"settings":',
  );

  const script = clone();
  script.plan.name = '<script>alert(1)</script>'.padEnd(80, 'x');
  files['script-name-too-long.json'] = JSON.stringify(script);

  // 1e999 parses to Infinity.
  files['infinite-coordinate.json'] = JSON.stringify(good).replace('"x":10', '"x":1e999');

  const outside = clone();
  outside.plan.objects[0].shape.x = W * 5;
  files['outside-map.json'] = JSON.stringify(outside);

  const huge = clone();
  huge.plan.objects[0].shape = {
    kind: 'polygon',
    points: Array.from({ length: 10_000 }, (_, i) => ({
      x: r2(W / 2 + Math.cos(i) * 10),
      y: r2(H / 2 + Math.sin(i) * 10),
    })),
  };
  files['ten-thousand-points.json'] = JSON.stringify(huge);

  let nested = '{"a":1}';
  for (let i = 0; i < 5000; i++) nested = `{"a":${nested}}`;
  files['deeply-nested.json'] = nested;

  const dupes = clone();
  dupes.plan.objects.push({ ...dupes.plan.objects[0] });
  files['duplicate-ids.json'] = JSON.stringify(dupes);

  files['wrong-format.json'] = JSON.stringify({ ...good, format: 'something-else' });
  files['not-json.json'] = '{"format": "habitat-blueprint-plan", ';
  return files;
}

mkdirSync(join(out, 'hostile'), { recursive: true });
const write = (name, data) =>
  writeFileSync(
    join(out, name),
    typeof data === 'string' ? data : `${JSON.stringify(data, null, 1)}\n`,
  );
write('empty.zooplan.json', planFile('fixture-empty', 'Empty (test)', []));
write('crystal-ridge-like.zooplan.json', crystalRidge());
write('stress-500.zooplan.json', stress500());
for (const [name, text] of Object.entries(hostile())) write(join('hostile', name), text);
console.log(`Wrote fixtures to ${out} (map ${W} × ${H} m from ${preset.id}).`);
