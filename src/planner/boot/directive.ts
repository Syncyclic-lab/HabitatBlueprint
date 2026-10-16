/**
 * client:progress — an Astro client directive that downloads the planner's code with a real
 * progress bar before hydrating it.
 *
 * It fetches the island's component and renderer modules, follows their static imports (as
 * soon as each file's import list has streamed in, so dependencies download in parallel), and
 * counts bytes as they arrive. The build writes the exact total into #boot-screen
 * (data-boot-bytes, scripts/postbuild.mjs); without it the total is estimated. When everything
 * has arrived (and sits in the HTTP cache), Astro's own loader imports the same files without
 * downloading them again.
 */
import type { ClientDirective } from 'astro';
import { failBoot, setBoot } from './bootDom.ts';

const DOWNLOAD_START = 4;
const DOWNLOAD_END = 64;
/** Typical gzip/brotli ratio for minified JS, used to estimate the unpacked size. */
const COMPRESSION_ESTIMATE = 3.2;

/** Static imports in a minified ES module: `import"./a.js"` and `from"./b.js"`. */
export function staticImports(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/(?:\bimport|\bfrom)\s*["']([^"'\s]+\.js)["']/g)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

async function downloadWithProgress(entries: string[], knownTotal: number): Promise<void> {
  const files = new Map<string, { loaded: number; total: number }>();
  const pending: Promise<void>[] = [];
  const seen = new Set<string>();

  const report = () => {
    let loaded = 0;
    let estimate = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      estimate += f.total;
    }
    const total = knownTotal > 0 ? Math.max(knownTotal, loaded) : estimate;
    const share = total > 0 ? Math.min(1, loaded / total) : 0;
    const kb = (n: number) => Math.max(1, Math.round(n / 1024));
    setBoot(
      DOWNLOAD_START + (DOWNLOAD_END - DOWNLOAD_START) * share,
      'download',
      `${kb(loaded)} / ${kb(total)} kB`,
    );
  };

  const fetchOne = async (url: string): Promise<void> => {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const length = Number(res.headers.get('content-length') ?? 0);
    const encoded = (res.headers.get('content-encoding') ?? 'identity') !== 'identity';
    const entry = {
      loaded: 0,
      total: length > 0 ? (encoded ? length * COMPRESSION_ESTIMATE : length) : 60_000,
    };
    files.set(url, entry);
    report();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    const follow = () => {
      for (const spec of staticImports(text)) {
        const next = new URL(spec, url);
        if (next.origin === location.origin && !seen.has(next.href)) {
          seen.add(next.href);
          pending.push(fetchOne(next.href));
        }
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      // Bundled modules list their imports first: start those downloads straight away.
      follow();
      entry.loaded += value.byteLength;
      entry.total = Math.max(entry.total, entry.loaded * 1.02);
      report();
    }
    text += decoder.decode();
    follow();
    entry.total = entry.loaded;
    report();
  };

  for (const e of entries) {
    const abs = new URL(e, location.href).href;
    if (!seen.has(abs)) {
      seen.add(abs);
      pending.push(fetchOne(abs));
    }
  }
  // Imports discovered along the way join `pending`; wait until it stops growing.
  for (let done = 0; done < pending.length; done = pending.length) {
    await Promise.all(pending.slice(done));
  }
}

const progressDirective: ClientDirective = (load, _options, el) => {
  // Astro catches import and render errors itself and reports them with this event, so the
  // loading screen listens for it to show the error and a reload link instead of waiting forever.
  el.addEventListener('astro:hydration-error', () => failBoot(), { once: true });
  void (async () => {
    setBoot(DOWNLOAD_START, 'download');
    const entries = [el.getAttribute('renderer-url'), el.getAttribute('component-url')].filter(
      (u): u is string => typeof u === 'string' && u.length > 0,
    );
    const knownTotal = Number(document.getElementById('boot-screen')?.dataset.bootBytes ?? 0);
    try {
      await downloadWithProgress(entries, knownTotal);
    } catch {
      // Progress is a nicety: if the prefetch fails, Astro's import below still loads the code.
    }
    setBoot(DOWNLOAD_END + 1, 'start');
    const hydrate = await load();
    await hydrate();
  })().catch(() => failBoot());
};

export default progressDirective;
