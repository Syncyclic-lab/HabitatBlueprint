#!/usr/bin/env node
/**
 * Dev helper: full-page screenshots of the preview build for visual review.
 * Usage: node scripts/screenshot.mjs <path-under-base> <out.png> [width] [height] [light|dark]
 * Needs `npm run preview` (or scripts/serve.mjs) running on port 4321.
 */
import { chromium } from '@playwright/test';

const [path = '', out = 'screenshot.png', width = '1280', height = '800', scheme = 'light'] =
  process.argv.slice(2);
const base = (process.env.SITE_BASE ?? '/HabitatBlueprint').replace(/\/+$/, '');
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  colorScheme: scheme === 'dark' ? 'dark' : 'light',
  reducedMotion: 'reduce',
});
// Pass "." for the home page (some shells drop empty arguments).
await page.goto(`http://localhost:4321${base}/${path === '.' ? '' : path}`);
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: process.env.FULL !== '0' });
await browser.close();
console.log(`Saved ${out}`);
