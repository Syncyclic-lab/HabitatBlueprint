/**
 * Shared Playwright fixtures. Every test using `test` from this file automatically fails if:
 * - the page reports a Content Security Policy violation,
 * - the page requests anything from another origin,
 * - a cookie is set (by script or by a Set-Cookie header).
 */
import { test as base, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

declare global {
  interface Window {
    __cspViolations: string[];
  }
}

export const test = base.extend<{ guards: undefined }>({
  guards: [
    async ({ page, context, baseURL }, use) => {
      const origin = new URL(baseURL ?? 'http://localhost:4321').origin;
      const thirdParty: string[] = [];
      const setCookies: string[] = [];

      await page.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener('securitypolicyviolation', (e) => {
          window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`);
        });
      });
      page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return;
        if (new URL(url).origin !== origin) thirdParty.push(url);
      });
      page.on('response', async (response) => {
        const header = await response.headerValue('set-cookie');
        if (header) setCookies.push(`${response.url()}: ${header}`);
      });

      await use(undefined);

      const violations = await page
        .evaluate(() => window.__cspViolations ?? [])
        .catch(() => [] as string[]);
      expect(violations, 'CSP violations').toEqual([]);
      expect(thirdParty, 'third-party requests').toEqual([]);
      expect(setCookies, 'Set-Cookie headers').toEqual([]);
      expect(await context.cookies(), 'cookies').toEqual([]);
      const scriptCookies = await page.evaluate(() => document.cookie).catch(() => '');
      expect(scriptCookies, 'document.cookie').toBe('');
    },
    { auto: true },
  ],
});

export { expect };

/** Runs axe with the WCAG 2.0/2.1/2.2 A and AA rules and expects zero violations. */
export async function expectNoAxeViolations(page: Page, context?: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
  );
  expect(summary, `axe violations${context ? ` (${context})` : ''}`).toEqual([]);
}

/** Every content route, relative to the base URL. */
export const CONTENT_ROUTES = [
  { path: '', name: 'home' },
  { path: 'help', name: 'help' },
  { path: 'accessibility', name: 'accessibility' },
  { path: 'accessibility/report', name: 'accessibility report' },
  { path: 'privacy', name: 'privacy' },
  { path: 'terms', name: 'terms' },
  { path: 'credits', name: 'credits' },
] as const;
