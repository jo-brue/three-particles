import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_PRESETS_DIR = path.resolve(__dirname, 'public/assets/defaults');
const DEFAULT_PRESETS_VIRTUAL_ID = 'virtual:default-presets';
const DEFAULT_PRESETS_RESOLVED_ID = '\0' + DEFAULT_PRESETS_VIRTUAL_ID;

function listDefaultPresetFiles(): string[] {
  try {
    return fs.readdirSync(DEFAULT_PRESETS_DIR)
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

// Exposes every *.json file dropped into public/assets/defaults as a virtual module, so the
// editor's "Default presets" list auto-updates from the filesystem instead of needing a
// hand-maintained manifest. Files there are exported presets (same shape downloadConfig()
// produces) served as static assets and fetched by filename at runtime.
function defaultPresetsPlugin(): Plugin {
  return {
    name: 'default-presets',
    resolveId(id) {
      if (id === DEFAULT_PRESETS_VIRTUAL_ID) return DEFAULT_PRESETS_RESOLVED_ID;
    },
    load(id) {
      if (id === DEFAULT_PRESETS_RESOLVED_ID) {
        return `export default ${JSON.stringify(listDefaultPresetFiles())};`;
      }
    },
    configureServer(server) {
      server.watcher.add(DEFAULT_PRESETS_DIR);
      server.watcher.on('all', (event, changedPath) => {
        if (event !== 'add' && event !== 'unlink') return;
        if (path.resolve(changedPath) !== changedPath || !changedPath.startsWith(DEFAULT_PRESETS_DIR)) return;
        const mod = server.moduleGraph.getModuleById(DEFAULT_PRESETS_RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

// The particle engine (../ParticleSystem, ../Helpers.ts) lives one level above this
// Vite project root and is maintained independently, so it's imported via the same
// `~` alias the engine's own source files use rather than being copied in.
export default defineConfig({
  plugins: [react(), defaultPresetsPlugin()],
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
