#!/usr/bin/env node
/**
 * Dev helper: screenshots of the planner with a realistic plan, for visual review.
 *   node scripts/planner-shots.mjs <out-dir> [fixture]
 * Writes desktop (light and dark), a selected habitat, the Objects and Stats tabs, and a
 * narrow (phone) layout. Needs the built site served on :4321 (npm run preview).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [outDir = 'shots', fixture = 'tests/fixtures/crystal-ridge-like.zooplan.json'] =
  process.argv.slice(2);
const base = (process.env.SITE_BASE ?? '/HabitatBlueprint').replace(/\/+$/, '');
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();

async function open(width, height, scheme) {
  const page = await browser.newPage({
    viewport: { width, height },
    colorScheme: scheme,
    reducedMotion: 'reduce',
  });
  await page.goto(`http://localhost:4321${base}/planner/`);
  await page.waitForSelector('#boot-screen', { state: 'detached' });
  const dialog = page.getByRole('dialog', { name: 'New plan' });
  await dialog.getByLabel('Zoo name').fill('Crystal Ridge');
  await dialog.getByLabel('Zoo name').press('Enter');
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('input[type=file][accept*="json"]').setInputFiles(resolve(fixture));
  await page
    .getByRole('dialog', { name: 'Open plan' })
    .getByRole('button', { name: 'Open as a new plan' })
    .click();
  await page.waitForFunction(() => document.querySelectorAll('.map-svg [data-id]').length > 0);
  await page.waitForTimeout(600);
  return page;
}

const shot = (page, name) => page.screenshot({ path: join(outDir, `${name}.png`) });

for (const scheme of ['light', 'dark']) {
  const page = await open(1440, 900, scheme);
  await shot(page, `desktop-${scheme}`);
  if (scheme === 'light') {
    await page.getByRole('tab', { name: 'Objects' }).click();
    await page.waitForTimeout(300);
    await shot(page, 'objects-tab');
    await page
      .getByRole('button', { name: /^Habitat 3\b/ })
      .first()
      .click();
    await page.getByRole('tab', { name: 'Inspector' }).click();
    await page.waitForTimeout(300);
    await shot(page, 'selected-habitat');
    await page.getByRole('tab', { name: 'Stats' }).click();
    await page.waitForTimeout(300);
    await shot(page, 'stats-tab');
  }
  await page.close();
}
const phone = await open(390, 844, 'light');
await shot(phone, 'phone');
await phone.close();
await browser.close();
console.log(`Saved screenshots to ${outDir}`);
