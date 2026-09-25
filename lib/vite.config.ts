import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import terser from '@rollup/plugin-terser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Bundles ../ParticleSystem + ../Helpers.ts (resolved through the same `~` alias the engine
// sources use) into one minified ES module. three.js stays external - consumers bring their own.
export default defineConfig({
  resolve: {
    alias: { '~': projectRoot },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'jb-three-particles',
    },
    // Vite skips build.minify for ES-format library builds (it would strip pure annotations),
    // so minify in rollup's output stage instead.
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: (id) => id === 'three' || id.startsWith('three/'),
      output: {
        plugins: [terser({ module: true, compress: { passes: 2 } })],
      },
    },
  },
  plugins: [
    dts({
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
      outDir: 'dist/types',
      // tsconfig maps `three` to ./node_modules/@types/three (the engine sources live outside this
      // folder, so plain resolution can't find it) and the plugin rewrites that mapping into a
      // relative path - turn it back into the bare specifier consumers resolve themselves.
      beforeWriteFile: (filePath, content) => ({
        filePath,
        content: content.replace(/(['"])[./]*(?:lib\/)?node_modules\/@types\/three(?:\/index\.d\.ts)?\1/g, "'three'"),
      }),
      entryRoot: projectRoot,
    }),
    {
      // The engine loads its noise texture from the site-root path '/assets/textures/noise.png'
      // (right for the editor, which serves it from public/). The package ships that file next to
      // the bundle instead, so resolve it relative to the bundle's own URL - works wherever the
      // package folder is served from, with no copying into the host site.
      name: 'noise-texture-relative-url',
      renderChunk(code) {
        const rewritten = code.replace(
          /(["'])\/assets\/textures\/noise\.png\1/g,
          'new URL("./assets/textures/noise.png", import.meta.url).href',
        );
        return rewritten === code ? null : { code: rewritten, map: null };
      },
    },
    {
      name: 'copy-noise-texture',
      async writeBundle() {
        const fs = await import('node:fs/promises');
        const dest = path.resolve(__dirname, 'dist/assets/textures');
        await fs.mkdir(dest, { recursive: true });
        await fs.copyFile(path.resolve(projectRoot, 'editor/public/assets/textures/noise.png'), path.join(dest, 'noise.png'));
      },
    },
  ],
});
