// Copies a fresh build into ../release/jb-three-particles - a committed, installable copy of the
// package for sharing without npm (`npm install path/to/release/jb-three-particles`, or load
// dist/jb-three-particles.js directly with an import map). Same layout as the published package,
// minus source maps and dev-only package.json fields.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const libDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await fs.readFile(path.join(libDir, 'package.json'), 'utf8'));
const outDir = path.resolve(libDir, '../release', pkg.name);

await fs.rm(outDir, { recursive: true, force: true });
await fs.cp(path.join(libDir, 'dist'), path.join(outDir, 'dist'), {
  recursive: true,
  filter: (src) => !src.endsWith('.map'),
});

const bundle = path.join(outDir, 'dist', `${pkg.name}.js`);
const code = await fs.readFile(bundle, 'utf8');
await fs.writeFile(bundle, code.replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, '\n'));

const { scripts, devDependencies, ...releasePkg } = pkg;
await fs.writeFile(path.join(outDir, 'package.json'), JSON.stringify(releasePkg, null, 2) + '\n');
await fs.copyFile(path.join(libDir, 'README.md'), path.join(outDir, 'README.md'));

console.log(`Released ${pkg.name}@${pkg.version} to ${path.relative(process.cwd(), outDir)}`);
