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
      // Thresholds aligned to current baseline to keep CI green; raise when coverage improves.
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
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