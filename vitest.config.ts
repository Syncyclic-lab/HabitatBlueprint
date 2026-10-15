import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['tests/unit/setup.ts'],
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
