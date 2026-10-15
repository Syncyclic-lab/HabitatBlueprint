/**
 * Site-wide constants. The site name lives here and nowhere else.
 * It must never contain "Planet Zoo", "PZ" or "PZ2" (docs/10-legal-and-ip.md §2).
 */
export const SITE_NAME = 'HabitatBlueprint';

/** Short description used in meta tags. */
export const SITE_DESCRIPTION =
  'A free, private planning tool for Planet Zoo 2 players. Lay out habitats, buildings and paths on a true-scale map and see the area of every space as you draw.';

/** App version, shown in exports and the credits page. Keep in step with package.json. */
export const APP_VERSION = '0.1.0';

/** Public source repository. */
export const REPO_URL = 'https://github.com/Syncyclic-lab/HabitatBlueprint';

/**
 * How people reach us. A dedicated email address is still an open question (docs/13 Q5),
 * so feedback goes through the public issue tracker and security reports through
 * GitHub's private advisory form.
 */
export const CONTACT = {
  feedbackUrl: `${REPO_URL}/issues`,
  securityUrl: `${REPO_URL}/security/advisories/new`,
  email: null as string | null,
} as const;

/** Name used for the IndexedDB database. Changing it orphans everyone's saved plans. */
export const DB_NAME = 'habitat-blueprint';

/** File format identifier written into saved plan files. */
export const PLAN_FILE_FORMAT = 'habitat-blueprint-plan';
export const PLAN_FILE_EXTENSION = '.zooplan.json';

/** Dates shown on the legal and accessibility pages. */
export const DATES = {
  accessibilityStatement: '2026-10-15',
  privacy: '2026-10-15',
  terms: '2026-10-15',
} as const;

/**
 * Joins a site-relative path to the deploy base (e.g. "/HabitatBlueprint/").
 * Every internal link goes through this so the site works under any base path.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const clean = path.replace(/^\/+/, '');
  return clean === '' ? `${base}/` : `${base}/${clean}`;
}
