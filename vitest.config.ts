import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: process.env.ILLUSTRATOR_E2E !== '1',
    // Illustrator and osascript may outlive a timed-out call. Process-isolated
    // workers avoid stale native handles poisoning later test runs.
    pool: 'forks',
    maxWorkers: process.env.ILLUSTRATOR_E2E === '1' ? 1 : 2,
  },
});
