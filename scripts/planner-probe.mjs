#!/usr/bin/env node
/**
 * Dev helper: opens the planner in Chromium, records the loading-screen progress, console
 * errors and timings, then takes a screenshot.
 * Usage: node scripts/planner-probe.mjs <out.png> [width] [height] [light|dark] [throttle]
 * "throttle" emulates a slow 4G connection to make the progress steps visible.
 */
import { chromium } from '@playwright/test';

const [out = 'planner.png', width = '1440', height = '900', scheme = 'light', throttle = ''] =
  process.argv.slice(2);
const base = (process.env.SITE_BASE ?? '/HabitatBlueprint').replace(/\/+$/, '');
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: Number(width), height: Number(height) },
  colorScheme: scheme === 'dark' ? 'dark' : 'light',
});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
if (throttle) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
}
await page.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__csp.push(
      `${e.violatedDirective} ${e.sourceFile}:${e.lineNumber}:${e.columnNumber} sample=${e.sample}`,
    );
  });
  window.__progress = [];
  const record = () => {
    const el = document.getElementById('boot-screen');
    if (!el) return;
    const p = el.querySelector('progress');
    const label = el.querySelector('[data-boot-label]')?.textContent ?? '';
    const detail = el.querySelector('[data-boot-detail]')?.textContent ?? '';
    const entry = `${Math.round(p?.value ?? 0)}% ${label} ${detail}`.trim();
    if (window.__progress.at(-1) !== entry) window.__progress.push(entry);
  };
  const tick = () => {
    record();
    if (document.getElementById('boot-screen') || performance.now() < 3000)
      requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const t0 = Date.now();
await page.goto(`http://localhost:4321${base}/planner/`);
await page
  .waitForSelector('#boot-screen', { state: 'detached', timeout: 60_000 })
  .catch(() => errors.push('boot screen never finished'));
const ready = Date.now() - t0;
await page.waitForTimeout(400);
const progress = await page.evaluate(() => window.__progress);
const csp = await page.evaluate(() => window.__csp);
await page.screenshot({ path: out });
console.log(
  JSON.stringify({ readyMs: ready, progress: progress.slice(0, 40), csp, errors }, null, 2),
);
await browser.close();
