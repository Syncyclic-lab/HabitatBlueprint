/**
 * Shared Playwright fixtures. Every test using `test` from this file automatically fails if:
 * - the page reports a Content Security Policy violation,
 * - the page requests anything from another origin,
 * - a cookie is set (by script or by a Set-Cookie header),
 * - a script throws an uncaught error.
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
    async ({ page, context, baseURL, browserName }, use) => {
      const origin = new URL(baseURL ?? 'http://localhost:4321').origin;
      const thirdParty: string[] = [];
      const setCookies: string[] = [];
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));

      await page.addInitScript(
        ({ webkit }) => {
          window.__cspViolations = [];
          document.addEventListener('securitypolicyviolation', (e) => {
            // Playwright's WebKit reports style-src-attr whenever a <select> is created, even a
            // static one in plain HTML with no style attribute: its built-in control styles
            // itself. The report targets the <select>, or the document if the element isn't in
            // the page yet. Our pages have no style="" attributes (scripts/postbuild.mjs) and
            // scripts set styles only through the CSSOM, so in WebKit those reports are skipped.
            const fromSelect =
              e.target instanceof HTMLSelectElement || !(e.target instanceof Element);
            if (webkit && e.violatedDirective === 'style-src-attr' && fromSelect) return;
            const where =
              e.target instanceof Element
                ? `${e.target.nodeName.toLowerCase()}.${e.target.getAttribute('class') ?? ''}`
                : '';
            const source = e.sourceFile
              ? `${e.sourceFile.split('/').pop()}:${e.lineNumber}:${e.columnNumber}`
              : '';
            window.__cspViolations.push(
              `${e.violatedDirective} ${e.blockedURI} ${where} ${source}`.trim(),
            );
          });
        },
        { webkit: browserName === 'webkit' },
      );
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
      expect(pageErrors, 'uncaught page errors').toEqual([]);
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
