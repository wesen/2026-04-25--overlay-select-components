import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'content_scripts/main.js'),
      name: 'PyxisExtractor',
      fileName: () => 'overlay.js',
      formats: ['iife'],
    },
    outDir: 'content_scripts',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: false,
  },
});
