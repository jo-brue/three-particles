// Generates a tileable value-noise texture at public/assets/textures/noise.png.
// uniforms.ts (ParticleSystem/uniforms.ts) loads this path for the shared `tNoise`
// uniform used by flicker(), simpleNoise(), heightOffsetNoise(), etc.
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 512;
const CELL = 32; // lattice cell size in px, tiled so wrapping is seamless

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const latticeCells = SIZE / CELL;
const lattice = [];
for (let y = 0; y < latticeCells; y++) {
  lattice.push([]);
  for (let x = 0; x < latticeCells; x++) {
    lattice[y].push(Math.random());
  }
}

function sample(x, y) {
  const gx = Math.floor(x / CELL);
  const gy = Math.floor(y / CELL);
  const fx = fade((x % CELL) / CELL);
  const fy = fade((y % CELL) / CELL);

  const wrap = (v) => ((v % latticeCells) + latticeCells) % latticeCells;

  const v00 = lattice[wrap(gy)][wrap(gx)];
  const v10 = lattice[wrap(gy)][wrap(gx + 1)];
  const v01 = lattice[wrap(gy + 1)][wrap(gx)];
  const v11 = lattice[wrap(gy + 1)][wrap(gx + 1)];

  const top = lerp(v00, v10, fx);
  const bottom = lerp(v01, v11, fx);
  return lerp(top, bottom, fy);
}

const png = new PNG({ width: SIZE, height: SIZE });

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    // Sum a few octaves for a less uniform, more "cloudy" look.
    let v = 0;
    let amp = 1;
    let totalAmp = 0;
    let freqScale = 1;
    for (let o = 0; o < 4; o++) {
      v += sample((x * freqScale) % SIZE, (y * freqScale) % SIZE) * amp;
      totalAmp += amp;
      amp *= 0.5;
      freqScale *= 2;
    }
    v /= totalAmp;

    const c = Math.max(0, Math.min(255, Math.round(v * 255)));
    const idx = (SIZE * y + x) << 2;
    png.data[idx] = c;
    png.data[idx + 1] = c;
    png.data[idx + 2] = c;
    png.data[idx + 3] = 255;
  }
}

const outDir = path.resolve(__dirname, '../public/assets/textures');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'noise.png');
png.pack().pipe(fs.createWriteStream(outPath)).on('finish', () => {
  console.log('Wrote', outPath);
});
