import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds timeout for tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
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
