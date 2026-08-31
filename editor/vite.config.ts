import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// The particle engine (../ParticleSystem, ../Helpers.ts) lives one level above this
// Vite project root and is maintained independently, so it's imported via the same
// `~` alias the engine's own source files use rather than being copied in.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': projectRoot,
      // ParticleSystem/*.ts and Helpers.ts live outside this Vite project root, so plain
      // node_modules resolution (which walks up from the importing file) can't find "three"
      // installed here. Pin it to a single copy instead of letting a second one resolve.
      three: path.resolve(__dirname, 'node_modules/three'),
    },
  },
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
});
