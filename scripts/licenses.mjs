#!/usr/bin/env node
/**
 * Licence gate (docs/10-legal-and-ip.md §5).
 *
 * Checks every package that ships to browsers: the production dependency tree from
 * package.json "dependencies", plus Astro and @astrojs/react, whose small client runtimes are
 * bundled into pages. Fails (exit 1) on any licence outside the allowlist.
 *
 * With --write, also writes src/generated/licenses.json, which /credits renders.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');

const ALLOWED = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'CC0-1.0',
  'BlueOak-1.0.0',
  'Unlicense',
  'OFL-1.1',
]);

/** Build tools whose client runtime ships, checked on their own (not their dependency trees). */
const BUILD_TOOLS_WITH_RUNTIME = ['astro', '@astrojs/react'];

/** Evaluates a simple SPDX expression: OR needs one allowed side, AND needs both. */
export function isAllowed(expression) {
  if (!expression || typeof expression !== 'string') return false;
  const expr = expression.trim().replace(/^\((.*)\)$/, '$1');
  if (/\s+OR\s+/.test(expr)) return expr.split(/\s+OR\s+/).some((part) => isAllowed(part));
  if (/\s+AND\s+/.test(expr)) return expr.split(/\s+AND\s+/).every((part) => isAllowed(part));
  return ALLOWED.has(expr);
}

function licenceOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ');
  return null;
}

function readPkg(dir) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
}

/** Runs npm's own CLI script with this Node binary, so no shell is involved on any platform. */
function npmCli() {
  if (process.env.npm_execpath?.endsWith('.js')) return process.env.npm_execpath;
  const besideNode = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (existsSync(besideNode)) return besideNode;
  return join(dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
}

function productionPackageDirs() {
  let out;
  try {
    out = execFileSync(process.execPath, [npmCli(), 'ls', '--omit=dev', '--all', '--parseable'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // npm ls exits non-zero for extraneous or missing optional packages but still prints the tree.
    out = error.stdout ?? '';
  }
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== root && existsSync(join(line, 'package.json')));
}

const seen = new Map();
for (const dir of productionPackageDirs()) {
  const pkg = readPkg(dir);
  const key = `${pkg.name}@${pkg.version}`;
  if (!seen.has(key)) {
    seen.set(key, {
      name: pkg.name,
      version: pkg.version,
      license: licenceOf(pkg),
      kind: 'runtime',
    });
  }
}
for (const name of BUILD_TOOLS_WITH_RUNTIME) {
  const pkg = readPkg(join(root, 'node_modules', name));
  seen.set(`${pkg.name}@${pkg.version}`, {
    name: pkg.name,
    version: pkg.version,
    license: licenceOf(pkg),
    kind: 'build',
  });
}

const entries = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
const violations = entries.filter((e) => !isAllowed(e.license));

if (violations.length > 0) {
  console.error('Licence check failed. These packages are not on the allowlist:');
  for (const v of violations)
    console.error(`  ${v.name}@${v.version}: ${v.license ?? 'no licence field'}`);
  process.exit(1);
}

console.log(`Licence check passed: ${entries.length} packages, all on the allowlist.`);

if (write) {
  const outDir = join(root, 'src', 'generated');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'licenses.json'), `${JSON.stringify(entries, null, 2)}\n`);
  console.log('Wrote src/generated/licenses.json');
}
