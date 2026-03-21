import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/tests/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'client/**',
      // Orphaned tests for old pipeline modules that no longer exist
      'server/tests/listing-broker-realism-scorecard.test.ts',
      'server/tests/listing-final-audit-subflow.test.ts',
      'server/tests/listing-input-signal-coverage.test.ts',
      'server/tests/listing-issue-evaluator.test.ts',
      'server/tests/listing-loop-coordinator.test.ts',
      'server/tests/listing-quality-guards.test.ts',
      'server/tests/listing-recovery-policy.test.ts',
      'server/tests/listing-refinement-coordinator.test.ts',
      'server/tests/listing-refinement-subflow.test.ts',
      'server/tests/listing-repair-strategies.test.ts',
      'server/tests/listing-rewrite-evaluator.test.ts',
      'server/tests/listing-run-state.test.ts',
      'server/tests/listing-selection-subflow.test.ts',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },
    setupFiles: ['./server/tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': '/server',
      '@shared': '/shared'
    }
  }
});
