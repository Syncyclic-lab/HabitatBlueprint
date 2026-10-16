import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Test the same build of polygon-clipping that ships to browsers. Its ES module build uses
    // exact predicates (robust-predicates); the CommonJS build Node would load doesn't, and the
    // two can disagree on hard inputs.
    alias: {
      'polygon-clipping': fileURLToPath(
        new URL('./node_modules/polygon-clipping/dist/polygon-clipping.esm.js', import.meta.url),
      ),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['tests/unit/setup.ts'],
    server: { deps: { inline: ['polygon-clipping'] } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/generated/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: {
        // The area numbers are the product (CLAUDE.md): geometry needs full coverage.
        'src/geometry/**': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
