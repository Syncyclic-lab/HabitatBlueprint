#!/usr/bin/env node
/**
 * Serves dist/ locally under the deploy base path, with the production security headers.
 * Used by `npm run preview`, Playwright and Lighthouse CI. No dependencies.
 *
 * Usage: node scripts/serve.mjs [--port 4321]
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { securityHeaders } from './security-headers.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const base = (process.env.SITE_BASE ?? '/HabitatBlueprint').replace(/\/+$/, '');
const portArg = process.argv.indexOf('--port');
const port = Number(portArg > -1 ? process.argv[portArg + 1] : (process.env.PORT ?? 4321));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const headers = securityHeaders({ local: true });

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const target = normalize(join(dist, decoded));
  if (target !== dist && !target.startsWith(dist + sep)) return null;
  if (existsSync(target) && statSync(target).isFile()) return target;
  const index = join(target, 'index.html');
  if (existsSync(index)) return index;
  const html = `${target}.html`;
  if (existsSync(html)) return html;
  return null;
}

function send(res, status, file) {
  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const extra = file.includes(`${sep}_astro${sep}`)
    ? { 'Cache-Control': 'public, max-age=31536000, immutable' }
    : { 'Cache-Control': 'no-cache' };
  res.writeHead(status, { ...headers, ...extra, 'Content-Type': type });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, headers).end();
    return;
  }
  if (url.pathname === '/' && base !== '') {
    res.writeHead(302, { ...headers, Location: `${base}/` }).end();
    return;
  }
  if (base !== '' && url.pathname !== base && !url.pathname.startsWith(`${base}/`)) {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  if (url.pathname === base) {
    res.writeHead(301, { ...headers, Location: `${base}/` }).end();
    return;
  }
  const file = resolveFile(url.pathname.slice(base.length) || '/');
  if (file) {
    send(res, 200, file);
    return;
  }
  const notFound = join(dist, '404.html');
  if (existsSync(notFound)) {
    send(res, 404, notFound);
    return;
  }
  res.writeHead(404, { ...headers, 'Content-Type': 'text/plain' }).end('Not found');
});

server.listen(port, () => {
  console.log(`Serving dist/ at http://localhost:${port}${base}/ with production headers`);
});
