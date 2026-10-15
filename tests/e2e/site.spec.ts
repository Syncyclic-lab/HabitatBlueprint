import { test, expect, expectNoAxeViolations, CONTENT_ROUTES } from './fixtures';

const DISCLAIMER_START = 'is an unofficial, fan-made planning tool.';

for (const route of CONTENT_ROUTES) {
  test.describe(`${route.name} page`, () => {
    test('has the shared structure: title, skip link, landmarks, one H1, footer disclaimer', async ({
      page,
      browserName,
    }) => {
      await page.goto(route.path);
      await expect(page).toHaveTitle(/HabitatBlueprint/);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toContainText(DISCLAIMER_START);
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

      // The skip link is the first focusable element and moves focus to <main>.
      // WebKit, like Safari, leaves links out of the default Tab order, so focus it directly there.
      const skip = page.getByRole('link', { name: 'Skip to main content' });
      if (browserName === 'webkit') await skip.focus();
      else await page.keyboard.press('Tab');
      await expect(skip).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main')).toBeFocused();
    });

    test('footer links are identical and in the same order @a11y', async ({ page }) => {
      await page.goto(route.path);
      const footerLinks = await page
        .getByRole('navigation', { name: 'Site information' })
        .getByRole('link')
        .allTextContents();
      expect(footerLinks).toEqual([
        'Privacy',
        'Terms',
        'Accessibility',
        'Credits',
        'Help',
        'Source code',
      ]);
    });

    for (const scheme of ['light', 'dark'] as const) {
      test(`has no axe violations in ${scheme} mode @a11y`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(route.path);
        await expectNoAxeViolations(page, `${route.name}, ${scheme}`);
      });
    }

    test('has no axe violations with forced colours @a11y', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(route.path);
      await expectNoAxeViolations(page, `${route.name}, forced colours`);
    });
  });
}

test('content pages keep layout shift under 0.1 @perf', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Layout Instability API is Chromium-only');
  for (const route of CONTENT_ROUTES) {
    await page.goto(route.path);
    await page.waitForLoadState('networkidle');
    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as PerformanceEntry[] & { value: number }[]) {
              total += (entry as unknown as { value: number }).value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve(total), 500);
        }),
    );
    expect(cls, `CLS on ${route.name}`).toBeLessThan(0.1);
  }
});

test('page titles are unique', async ({ page }) => {
  const titles = new Set<string>();
  for (const route of CONTENT_ROUTES) {
    await page.goto(route.path);
    titles.add(await page.title());
  }
  expect(titles.size).toBe(CONTENT_ROUTES.length);
});

test('unknown pages show the 404 page with links home and to the planner', async ({ page }) => {
  const response = await page.goto('this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Open the planner' }),
  ).toBeVisible();
  await expectNoAxeViolations(page, '404');
});

test('security headers are served by the preview server', async ({ request }) => {
  const response = await request.get('');
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
});

test('security.txt is published', async ({ request }) => {
  const response = await request.get('.well-known/security.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('Contact:');
  expect(body).toContain('Expires:');
});
