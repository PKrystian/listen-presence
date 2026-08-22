import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['extension/src/**/*.test.ts'],
    environment: 'jsdom',
    restoreMocks: true,
    clearMocks: true,
  },
});
