import { expect, type Page } from '@playwright/test';

/** Opens the planner on a fresh browser profile and creates a plan through the first-run dialog. */
export async function openPlanner(
  page: Page,
  options: { name?: string; create?: boolean } = {},
): Promise<void> {
  await page.goto('planner');
  await page.waitForSelector('#boot-screen', { state: 'detached', timeout: 30_000 });
  const dialog = page.getByRole('dialog', { name: 'New plan' });
  await expect(dialog).toBeVisible();
  if (options.create === false) return;
  const name = dialog.getByLabel('Zoo name');
  await name.fill(options.name ?? 'Test Zoo');
  await name.press('Enter');
  await expect(dialog).toBeHidden();
}

/** Focuses the map with F6 (keyboard only). */
export async function focusMap(page: Page): Promise<void> {
  const map = page.getByRole('application');
  for (let i = 0; i < 6; i++) {
    if (await map.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('F6');
  }
  await expect(map).toBeFocused();
}

/** The polite live region's latest text. */
export const announcement = (page: Page) => page.getByTestId('announcer-polite');

/** Presses a key n times. */
export async function pressTimes(page: Page, key: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await page.keyboard.press(key);
}

/** Draws a w × h meter rectangle with the keyboard crosshair (grid 5 m: one arrow = 5 m). */
export async function drawRectByKeyboard(
  page: Page,
  wSteps: number,
  hSteps: number,
): Promise<void> {
  await page.keyboard.press('2'); // rectangle mode
  await page.keyboard.press('Enter');
  await pressTimes(page, 'ArrowRight', wSteps);
  await pressTimes(page, 'ArrowDown', hSteps);
  await page.keyboard.press('Enter');
}
