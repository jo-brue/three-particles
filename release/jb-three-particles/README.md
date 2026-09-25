# jb-three-particles

GPU (GPGPU) particle system for three.js. Effects are composed from GLSL plugins, and
setups made in the particle editor load straight from their JSON export.

```sh
npm install jb-three-particles three
```

### Without npm (file-based)

`release/jb-three-particles/` in the repo is a committed, ready-to-use copy of the package.

With a bundler, install that folder as a copy (without `--install-links` npm symlinks it, and
TypeScript then can't find `three` next to the real folder):

```sh
npm install --install-links path/to/release/jb-three-particles three
```

Or copy the folder into your project and map it with an import map (no bundler needed):

```html
<script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
      "jb-three-particles": "./vendor/jb-three-particles/dist/jb-three-particles.js"
  } }
</script>
<script type="module">
  import { fetchParticleSystem } from 'jb-three-particles';
</script>
```

## Noise texture

The engine's noise texture ships in `dist/assets/textures/noise.png` and is loaded relative to
the bundle file, so it works wherever the package folder is served from - nothing to copy.

## Loading an editor export

```ts
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { loadParticleSystem } from 'jb-three-particles';

const renderer = new WebGLRenderer({ antialias: true });
const scene = new Scene();
const camera = new PerspectiveCamera();

// Adds the system to `scene` and applies the editor's view: background color, camera
// position/target/fov/near/far, tone mapping and pixel ratio. All three are optional.
const fx = loadParticleSystem(config, { scene, camera, renderer });

renderer.setAnimationLoop(() => renderer.render(scene, camera)); // system simulates itself

// Params marked "Expose" in the editor are uniforms, by their public name:
fx.params.wind.value.set(2, 0, 0);
fx.setParam('fade', { stops: [[0, '#00f'], [1, '#0f0']] }); // JSON-style values, as the editor saves them

fx.view;    // the resolved settings, e.g. fx.view.camera.target for OrbitControls
fx.dispose(); // removes it from the scene, frees shaders and the textures the loader created
```

`config` is the parsed JSON or the raw JSON string; `fetchParticleSystem(url, options)` fetches
it first. Everything not exposed is baked into the shader as a constant.

Options:

| option | |
|---|---|
| `scene`, `camera`, `renderer` | apply the editor's view to these (see above) |
| `transparent` | no background - the page shows through (default `false`) |
| `visible` | default `true` when `scene` is passed, otherwise `false` |
| `autoUpdate` | default `true`; set `false` and call `system.update(renderer, deltaTime)` yourself |
| `allLive` | make every param a uniform, as the editor does |

The camera's aspect is left alone - keep setting it on resize as usual.

## Composing in code

```ts
import { ParticleSystem, EmitterPlugins, UpdatePlugins, RenderPlugins } from 'jb-three-particles';

const system = new ParticleSystem(
  { emitter: EmitterPlugins.circle(64, 1, [1, 2]), baseSize: 20, autoUpdate: true, renderMode: 'billboard' },
  [EmitterPlugins.constantSpawn()],
  [UpdatePlugins.velocity({ x: 0, y: 1, z: 0 }), UpdatePlugins.turbulence(1.3, 0.015)],
  [RenderPlugins.soft({ x: 0, y: 1 })],
);
system.visible = true;
```

`handleProp`, `handleUniformProp`, `mergePluginData`, the `convertTo*String` helpers and
`GradientTexture` are exported for writing your own plugins.

## Building

`npm run build` in `lib/` bundles `../ParticleSystem` and `../Helpers.ts` into
`dist/jb-three-particles.js` (minified ES module, `three` external) plus type declarations.

`npm run release` builds and copies the result (without source maps) to
`release/jb-three-particles/` - commit that folder to share a new version.
