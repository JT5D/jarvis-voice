import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.native.ts', 'src/bin/**'],
    },
  },
});
