/**
 * Keyboard-only planner scripts (docs/12 K1–K9). No page.mouse in this file: every step uses
 * the keyboard (and locator.fill/press, which type into a focused field).
 */
import { test, expect } from './fixtures';
import {
  announcement,
  drawRectByKeyboard,
  focusMap,
  openPlanner,
  pressTimes,
} from './planner-helpers';

test.describe('keyboard-only planner tasks', () => {
  test('K1: create a plan, draw a 50 × 40 m habitat and read 2,000 m²', async ({ page }) => {
    await openPlanner(page, { name: 'Desert Zoo' });
    await focusMap(page);
    await page.keyboard.press('h');
    await expect(announcement(page)).toContainText('Habitat tool');
    await drawRectByKeyboard(page, 10, 8);
    await expect(announcement(page)).toContainText('2,000 square meters');
    const inspector = page.getByRole('tabpanel', { name: 'Inspector' });
    await expect(inspector.getByRole('row', { name: /Total area/ })).toContainText('2,000');
    await expect(inspector.getByRole('row', { name: /Perimeter/ })).toContainText('180.0');
    await expect(inspector.getByRole('row', { name: /% of map/ })).toContainText('0.20%');
  });

  test('K2: add a habitat by size, then resize it to an exact area', async ({ page }) => {
    await openPlanner(page);
    const add = page.getByRole('button', { name: 'Add habitat by size' }).first();
    await add.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Add habitat by size' });
    await dialog.getByLabel('Ellipse or circle').press('Space');
    await dialog.getByLabel('Area (m²)').fill('1500');
    await dialog.getByLabel('Area (m²)').press('Enter');
    await expect(dialog).toBeHidden();
    const inspector = page.getByRole('tabpanel', { name: 'Inspector' });
    await expect(inspector.getByRole('row', { name: /Total area/ })).toContainText('1,500');
    await inspector.getByRole('button', { name: 'Resize to area…' }).press('Enter');
    const resize = page.getByRole('dialog', { name: 'Resize to area' });
    await resize.getByLabel('New area (m²)').fill('2000');
    await resize.getByLabel('New area (m²)').press('Enter');
    await expect(inspector.getByRole('row', { name: /Total area/ })).toContainText('2,000');
  });

  test('K3: add a 10 × 10 m water zone and read land = total − 100', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    await drawRectByKeyboard(page, 10, 8); // 50 × 40 = 2,000 m²
    const inspector = page.getByRole('tabpanel', { name: 'Inspector' });
    await inspector.getByRole('button', { name: 'Add zone' }).press('Enter');
    await page.getByRole('menuitem', { name: 'Water', exact: true }).press('Enter');
    await focusMap(page);
    // The crosshair is still at the habitat's far corner; move back inside and draw 10 × 10.
    await pressTimes(page, 'ArrowLeft', 4);
    await pressTimes(page, 'ArrowUp', 4);
    await drawRectByKeyboard(page, 2, 2);
    await expect(inspector.getByRole('row', { name: /^Water/ })).toContainText('100');
    await expect(inspector.getByRole('row', { name: /^Land/ })).toContainText('1,900');
  });

  test('K4: edit a point in the vertex table and the area updates', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    await page.keyboard.press('1'); // polygon
    await page.keyboard.press('Enter');
    await pressTimes(page, 'ArrowRight', 4);
    await page.keyboard.press('Enter');
    await pressTimes(page, 'ArrowDown', 4);
    await page.keyboard.press('Enter');
    await pressTimes(page, 'ArrowLeft', 4);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // same point again: finish
    const inspector = page.getByRole('tabpanel', { name: 'Inspector' });
    await expect(inspector.getByRole('row', { name: /Total area/ })).toContainText('400');
    const x2 = inspector.getByLabel('Point 2 x (m)');
    const current = Number((await x2.inputValue()).replace(/,/g, ''));
    await x2.fill(String(current + 10));
    await x2.press('Enter');
    // A 20 × 20 square with one corner pulled 10 m east: 400 + 100 m².
    await expect(inspector.getByRole('row', { name: /Total area/ })).toContainText('500');
  });

  test('K5: draw a path, set its width and read length and paved area', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('p');
    await page.keyboard.press('Enter');
    await pressTimes(page, 'ArrowRight', 20); // 100 m
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // finish
    const inspector = page.getByRole('tabpanel', { name: 'Inspector' });
    await expect(inspector.getByRole('row', { name: /^Length/ })).toContainText('100.0');
    const width = inspector.getByLabel('Width (m)');
    await width.fill('6');
    await width.press('Enter');
    // 100 × 6 plus round caps π·3² ≈ 628 m².
    await expect(inspector.getByRole('row', { name: /Paved area/ })).toContainText('628');
  });

  test('K7: undo five steps, redo two, with announcements', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    for (let i = 0; i < 5; i++) {
      await drawRectByKeyboard(page, 2, 2);
      await pressTimes(page, 'ArrowRight', 2);
    }
    await page.keyboard.press('v');
    for (let i = 0; i < 5; i++) await page.keyboard.press('Control+z');
    await expect(announcement(page)).toContainText('Undid: create');
    await page.keyboard.press('Control+Shift+z');
    await page.keyboard.press('Control+y');
    await expect(announcement(page)).toContainText('Redid: create');
    await page.getByRole('tab', { name: 'Objects' }).press('Enter');
    await expect(page.getByText('Showing 2 of 2 objects')).toBeVisible();
  });

  test('K8: save to file, delete all data, open the file again', async ({ page }) => {
    await openPlanner(page, { name: 'Round Trip' });
    await focusMap(page);
    await page.keyboard.press('h');
    await drawRectByKeyboard(page, 4, 4);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).press('Enter');
    await page
      .getByRole('dialog', { name: 'Export and share' })
      .getByRole('button', { name: 'Save plan file' })
      .press('Enter');
    const file = await download;
    const path = await file.path();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Map settings' }).press('Enter');
    await page.getByRole('button', { name: 'Delete all my data…' }).press('Enter');
    const confirm = page.getByRole('dialog', { name: 'Delete all my data' });
    await confirm.getByLabel('Type DELETE to confirm').fill('DELETE');
    await confirm.getByLabel('Type DELETE to confirm').press('Enter');
    await expect(page.getByRole('dialog', { name: 'New plan' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('input[type=file][accept*="json"]').setInputFiles(path);
    const open = page.getByRole('dialog', { name: 'Open plan' });
    await expect(open).toContainText('Round Trip');
    await open.getByRole('button', { name: 'Open as a new plan' }).press('Enter');
    // Opening saves the plan first; wait for it to be announced as open.
    await expect(announcement(page)).toContainText('Opened Round Trip');
    await page.getByRole('tab', { name: 'Objects' }).press('Enter');
    await expect(page.getByText('Showing 1 of 1 objects')).toBeVisible();
  });

  test('K9: F6 cycles through every region and focus stays visible', async ({ page }) => {
    await openPlanner(page);
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('F6');
      const region = await page.evaluate(
        () => document.activeElement?.closest('[data-region]')?.getAttribute('data-region') ?? null,
      );
      expect(region).not.toBeNull();
      seen.push(region as string);
    }
    expect(new Set(seen)).toEqual(new Set(['top', 'tools', 'map', 'panel', 'status']));
  });

  test('Tab moves between objects on the map and then out of it (no keyboard trap)', async ({
    page,
  }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    await drawRectByKeyboard(page, 2, 2);
    await page.keyboard.press('v');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    await expect(announcement(page)).toContainText('Selected Habitat 1');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('application')).not.toBeFocused();
  });
});
