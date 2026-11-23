import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works from any sub-path (e.g. GitHub Pages).
  base: './',
  worker: { format: 'es' },
  // The example documents live in ../examples.
  server: { fs: { allow: ['..'] } },
});
