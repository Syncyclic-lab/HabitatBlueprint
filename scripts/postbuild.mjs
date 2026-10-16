#!/usr/bin/env node
/**
 * Post-build checks and outputs.
 * 1. Every HTML page must carry Astro's hashed CSP <meta> with no 'unsafe-inline' or
 *    'unsafe-eval', and must not contain inline style="" attributes (the CSP would block them).
 * 2. No page may reference a third-party origin (scripts, styles, images, fonts, frames).
 * 3. Writes dist/_headers (Cloudflare Pages format) with the full security header set.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { securityHeaders } from './security-headers.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const base = (process.env.SITE_BASE ?? '/HabitatBlueprint').replace(/\/+$/, '');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const problems = [];
const htmlFiles = walk(dist).filter((f) => f.endsWith('.html'));

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(dist, file);
  const meta = html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/i);
  if (!meta) {
    problems.push(`${rel}: missing CSP <meta>`);
  } else {
    const csp = meta[1];
    if (/unsafe-inline|unsafe-eval/.test(csp))
      problems.push(`${rel}: CSP allows unsafe-inline/eval`);
    if (!/script-src/.test(csp) || !/style-src/.test(csp)) {
      problems.push(`${rel}: CSP lacks script-src or style-src`);
    }
    const metaIndex = html.indexOf(meta[0]);
    const firstScript = html.search(/<script|<link[^>]+rel="stylesheet"|<style/i);
    if (firstScript !== -1 && firstScript < metaIndex) {
      problems.push(`${rel}: a script or style appears before the CSP <meta>`);
    }
  }
  if (/<[a-z][^>]*\sstyle="/i.test(html)) problems.push(`${rel}: inline style="" attribute`);
  // Links (<a href>, rel=canonical) to other sites are fine; loading resources from them is not.
  for (const tag of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const name = tag[1].toLowerCase();
    const attrs = tag[2];
    if (name === 'a') continue;
    if (name === 'link' && /rel="canonical"/i.test(attrs)) continue;
    for (const ref of attrs.matchAll(
      /\s(?:src|href|srcset|poster|data)="(?:https?:)?\/\/([^"/]+)/gi,
    )) {
      problems.push(`${rel}: <${name}> loads a resource from ${ref[1]}`);
    }
  }
}

/**
 * The planner's loading screen shows real download progress. Give it the exact total: the
 * island's component and renderer plus every module they import statically.
 */
function initialBytes(html) {
  const queue = [...html.matchAll(/(?:component-url|renderer-url)="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  let total = 0;
  while (queue.length > 0) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const code = readFileSync(join(dist, url.slice(base.length)), 'utf8');
    total += Buffer.byteLength(code);
    for (const m of code.matchAll(/(?:\bimport|\bfrom)\s*["']([^"'\s]+\.js)["']/g)) {
      queue.push(new URL(m[1], `http://x${url}`).pathname);
    }
  }
  return total;
}

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('id="boot-screen"') || !html.includes('client="progress"')) continue;
  const bytes = initialBytes(html);
  writeFileSync(
    file,
    html.replace('id="boot-screen"', `id="boot-screen" data-boot-bytes="${bytes}"`),
  );
  console.log(
    `${relative(dist, file)}: planner download ${Math.round(bytes / 1024)} kB before compression`,
  );
}

if (problems.length > 0) {
  console.error('Post-build check failed:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const headers = securityHeaders();
const lines = [`${base}/*`, ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`), ''];
lines.push(`${base}/_astro/*`, '  Cache-Control: public, max-age=31536000, immutable', '');
writeFileSync(join(dist, '_headers'), lines.join('\n'));

console.log(
  `Post-build check passed: ${htmlFiles.length} pages, CSP present, no third-party loads.`,
);
console.log('Wrote dist/_headers');
