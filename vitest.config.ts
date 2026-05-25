import { defineConfig } from 'vitest/config';

const isCi = process.env.CI === 'true' || process.env.CI === '1';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    // Heavy barrel imports (engine/shell) can exceed 30s under parallel CI load.
    testTimeout: isCi ? 90_000 : 60_000,
    hookTimeout: 15_000,
    // Serial file execution avoids global console mock races and import pile-ups on CI runners.
    fileParallelism: !isCi,
    reporters: isCi ? ['default', 'github-actions'] : ['default'],
    coverage: {
      // Use Istanbul provider for compatibility with Node 18 (avoids inspector/promises dependency)
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        'scripts/',
      ],
      // Thresholds aligned to current repository baseline; raise as coverage expands.
      thresholds: {
        lines: 38,
        functions: 43,
        branches: 31,
        statements: 37,
      },
    },
  },
  resolve: {
    alias: {
      '@signaler/core': './src/core/index.ts',
      '@signaler/reporting': './src/reporting/index.ts',
    },
  },
});
