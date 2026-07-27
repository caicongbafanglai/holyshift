import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 700
  },
  server: {
    strictPort: true
  },
  preview: {
    strictPort: true
  },
  test: {
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['e2e/**']
  }
});
