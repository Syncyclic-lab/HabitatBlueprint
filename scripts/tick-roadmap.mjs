#!/usr/bin/env node
/**
 * Dev helper: ticks roadmap boxes whose text starts with any of the given prefixes.
 * Usage: node scripts/tick-roadmap.mjs "prefix one" "prefix two" ...
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../docs/11-roadmap.md', import.meta.url);
let text = readFileSync(file, 'utf8');
let count = 0;
for (const prefix of process.argv.slice(2)) {
  const needle = `- [ ] ${prefix}`;
  if (text.includes(needle)) {
    text = text.replace(needle, `- [x] ${prefix}`);
    count++;
  } else {
    console.warn(`Not found (or already ticked): ${prefix}`);
  }
}
writeFileSync(file, text);
console.log(`Ticked ${count} item(s).`);
