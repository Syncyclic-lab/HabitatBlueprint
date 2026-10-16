#!/usr/bin/env node
/**
 * Dev helper: measures the planner with a large plan (docs/12 "Budgets").
 *   node scripts/perf-probe.mjs [fixture] [cpuSlowdown]
 * Opens the built site (npm run preview or scripts/serve.mjs on :4321), imports the fixture
 * (default tests/fixtures/stress-500.zooplan.json), then reports: time to open the plan,
 * pan and zoom frame rates, keyboard crosshair cost, and edit → readout latency.
 * cpuSlowdown (e.g. 4) emulates a slower laptop.
 */
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const fixture = resolve(process.argv[2] ?? 'tests/fixtures/stress-500.zooplan.json');
const slowdown = Number(process.argv[3] ?? 1);
const base = (process.env.SITE_BASE ?? '/HabitatBlueprint').replace(/\/+$/, '');

const browser = await chromium.launch({
  args: process.env.GPU
    ? ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu']
    : [],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
if (slowdown > 1) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: slowdown });
}

await page.goto(`http://localhost:4321${base}/planner/`);
await page.waitForSelector('#boot-screen', { state: 'detached', timeout: 60_000 });
const dialog = page.getByRole('dialog', { name: 'New plan' });
await dialog.getByLabel('Zoo name').fill('Perf');
await dialog.getByLabel('Zoo name').press('Enter');
await dialog.waitFor({ state: 'hidden' });

// ── Open the plan file ──
const t0 = Date.now();
await page.locator('input[type=file][accept*="json"]').setInputFiles(fixture);
await page
  .getByRole('dialog', { name: 'Open plan' })
  .getByRole('button', { name: 'Open as a new plan' })
  .click();
await page.waitForFunction(() => document.querySelectorAll('.map-svg [data-id]').length > 0, null, {
  timeout: 60_000,
});
await page.evaluate(
  () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
);
const openMs = Date.now() - t0;
const drawn = await page.evaluate(() => document.querySelectorAll('.map-svg [data-id]').length);

/** Runs `drive` while counting frames; returns fps and the worst frame. */
async function measureFrames(label, drive) {
  await page.evaluate(() => {
    window.__frames = [];
    window.__run = true;
    const loop = (t) => {
      window.__frames.push(t);
      if (window.__run) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const start = Date.now();
  await drive();
  const ms = Date.now() - start;
  const frames = await page.evaluate(() => {
    window.__run = false;
    return window.__frames;
  });
  const gaps = frames.slice(1).map((t, i) => t - frames[i]);
  const fps = (frames.length - 1) / (ms / 1000);
  const worst = Math.max(...gaps);
  console.log(
    `${label.padEnd(26)} ${fps.toFixed(0).padStart(3)} fps   worst frame ${worst.toFixed(0)} ms`,
  );
}

const box = await page.getByRole('application').boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;

await measureFrames('Pan (middle-button drag)', async () => {
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'middle' });
  for (let i = 0; i < 90; i++) {
    await page.mouse.move(cx + Math.sin(i / 10) * 200, cy + Math.cos(i / 10) * 120);
    await page.waitForTimeout(16);
  }
  await page.mouse.up({ button: 'middle' });
});

await measureFrames('Zoom (wheel)', async () => {
  await page.mouse.move(cx, cy);
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, i < 30 ? -60 : 60);
    await page.waitForTimeout(16);
  }
});

// ── Keyboard crosshair: average handler + render cost per arrow press ──
await page.getByRole('application').focus();
await page.keyboard.press('h');
const keyMs = await page.evaluate(async () => {
  const map = document.querySelector('[role="application"]');
  const times = [];
  for (let i = 0; i < 40; i++) {
    const t = performance.now();
    map.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  return { median: times[20], worst: times.at(-1) };
});
console.log(
  `Arrow key → next frame      median ${keyMs.median.toFixed(0)} ms   worst ${keyMs.worst.toFixed(0)} ms`,
);
await page.keyboard.press('Escape');
await page.keyboard.press('v');

// ── Edit → readout: change a habitat's width in the Inspector and wait for the new area ──
await page.getByRole('tab', { name: 'Objects' }).click();
await page
  .getByRole('button', { name: /^Habitat 1\b/ })
  .first()
  .click();
await page.getByRole('tab', { name: 'Inspector' }).click();
const inspector = page.getByRole('tabpanel', { name: 'Inspector' });
const width = inspector.getByLabel('Width (m)');
const before = await inspector.getByRole('row', { name: /Total area/ }).textContent();
const t1 = Date.now();
await width.fill(String(Number((await width.inputValue()).replace(/,/g, '')) + 5));
await width.press('Enter');
await page.waitForFunction(
  (prev) => {
    const row = [...document.querySelectorAll('[role="tabpanel"] tr')].find((r) =>
      r.textContent?.includes('Total area'),
    );
    return row && row.textContent !== prev;
  },
  before,
  { timeout: 10_000 },
);
console.log(`Edit → area readout         ${Date.now() - t1} ms (includes Playwright round trips)`);

console.log(
  `Open ${drawn} objects            ${openMs} ms${slowdown > 1 ? ` (CPU ×${slowdown})` : ''}`,
);
if (errors.length) console.log('Page errors:', errors);
await browser.close();
