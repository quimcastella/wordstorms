// Bundles the command line (scripts/storm.ts) into one JavaScript file for the
// published package: Node won't strip TypeScript types inside node_modules.
// Dependencies stay external; the example texts and the license are copied next to it.
import { copyFileSync, cpSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'scripts/storm.ts',
    outDir: 'dist-cli',
    emptyOutDir: true,
    target: 'node22',
    rollupOptions: { output: { entryFileNames: 'wordstorms.js' } },
  },
  plugins: [
    {
      name: 'copy-examples',
      closeBundle() {
        cpSync('../examples', 'dist-cli/examples', { recursive: true });
        copyFileSync('../LICENSE.txt', 'dist-cli/LICENSE.txt');
      },
    },
  ],
});
