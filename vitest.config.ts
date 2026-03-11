import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Stub out optional native peer deps so Vite doesn't fail on import analysis
      'expo-speech-recognition': new URL('./__tests__/stubs/expo-speech-recognition.ts', import.meta.url).pathname,
      'expo-speech': new URL('./__tests__/stubs/expo-speech.ts', import.meta.url).pathname,
    },
  },
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
