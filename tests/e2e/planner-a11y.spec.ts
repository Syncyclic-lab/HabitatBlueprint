/** axe scans of the planner states listed in docs/12 ("Planner states scanned by axe"). */
import { test, expect, expectNoAxeViolations } from './fixtures';
import { drawRectByKeyboard, focusMap, openPlanner, pressTimes } from './planner-helpers';

test.describe('planner states @a11y', () => {
  test('1. empty planner with the new-plan dialog open', async ({ page }) => {
    await openPlanner(page, { create: false });
    await expectNoAxeViolations(page, 'new plan dialog');
  });

  test('2. empty map after creation, with the inline prompt', async ({ page }) => {
    await openPlanner(page);
    await expect(page.getByText('Draw your first habitat')).toBeVisible();
    await expectNoAxeViolations(page, 'empty map');
  });

  test('3. habitat tool mid-drawing (3 points placed)', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    await page.keyboard.press('Enter');
    await pressTimes(page, 'ArrowRight', 4);
    await page.keyboard.press('Enter');
    await pressTimes(page, 'ArrowDown', 4);
    await page.keyboard.press('Enter');
    await expectNoAxeViolations(page, 'mid-drawing');
  });

  test('4 and 5. habitat selected in the Inspector, then vertex edit mode', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    await drawRectByKeyboard(page, 6, 4);
    await expectNoAxeViolations(page, 'inspector');
    await page.keyboard.press('v');
    await page.keyboard.press('Enter');
    await expectNoAxeViolations(page, 'vertex mode');
  });

  test('6. objects panel with 20 objects', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    for (let i = 0; i < 20; i++) {
      await drawRectByKeyboard(page, 1, 1);
      await pressTimes(page, 'ArrowRight', 2);
    }
    await page.getByRole('tab', { name: 'Objects' }).click();
    await expect(page.getByText('Showing 20 of 20 objects')).toBeVisible();
    await expectNoAxeViolations(page, 'objects panel');
  });

  test('7. context menu open', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    await drawRectByKeyboard(page, 4, 4);
    await page.keyboard.press('v');
    await page.keyboard.press('Shift+F10');
    await expect(page.getByRole('menu')).toBeVisible();
    await expectNoAxeViolations(page, 'context menu');
  });

  test('8. shortcuts dialog', async ({ page }) => {
    await openPlanner(page);
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    await expectNoAxeViolations(page, 'shortcuts dialog');
  });

  test('9. map settings with a validation error showing', async ({ page }) => {
    await openPlanner(page);
    await page.getByRole('button', { name: 'Map settings' }).click();
    const buffer = page.getByLabel('Safety margin (%)');
    await buffer.fill('99');
    await buffer.press('Enter');
    await expect(page.getByText('must be between 0 and 50')).toBeVisible();
    await expectNoAxeViolations(page, 'map settings error');
  });

  test('10 and 11. stats tables, legend and title block', async ({ page }) => {
    await openPlanner(page);
    await focusMap(page);
    await page.keyboard.press('h');
    await drawRectByKeyboard(page, 4, 4);
    await page.getByRole('tab', { name: 'Stats' }).click();
    await expectNoAxeViolations(page, 'stats');
    await page.getByRole('tab', { name: 'Areas' }).click();
    await page.getByRole('button', { name: 'Add area' }).click();
    await expectNoAxeViolations(page, 'areas and legend');
  });

  test('12. export dialog', async ({ page }) => {
    await openPlanner(page);
    await page.getByRole('button', { name: 'Export' }).click();
    await expectNoAxeViolations(page, 'export dialog');
  });

  for (const scheme of ['dark'] as const) {
    test(`planner in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openPlanner(page);
      await expectNoAxeViolations(page, scheme);
    });
  }

  test('planner with forced colours', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await openPlanner(page);
    await expectNoAxeViolations(page, 'forced colours');
  });
});

test('the loading screen reports progress and then gets out of the way', async ({ page }) => {
  const values: number[] = [];
  await page.exposeFunction('__report', (v: number) => values.push(v));
  await page.addInitScript(() => {
    const tick = () => {
      const p = document.querySelector<HTMLProgressElement>('#boot-screen progress');
      if (p) (window as unknown as { __report: (v: number) => void }).__report(p.value);
      if (document.getElementById('boot-screen') || performance.now() < 2000)
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await openPlanner(page, { create: false });
  expect(values.length).toBeGreaterThan(1);
  expect(Math.max(...values)).toBe(100);
  // Progress never goes backwards.
  for (let i = 1; i < values.length; i++)
    expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] as number);
  await expect(page.locator('#boot-screen')).toHaveCount(0);
});
