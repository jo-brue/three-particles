# Particle System — Notes & Findings

Reference notes on the custom Three.js GPGPU particle system. This file is meant to
live one level above the `ParticleSystem/` folder (i.e. next to it in the project root).

## What it is

A hand-rolled GPU particle system for Three.js (WebGL2, `GLSL3`).

- **Simulation:** ping-pong FBOs with Multiple Render Targets. One update pass writes
  three targets — state (`xyz` = position, `w` = age), rotation, and optional meta.
- **Update model:** a fullscreen-quad fragment shader (`ParticleUpdateMaterial` +
  `ParticleScene`) ages every texel/particle each frame. If `relAge >= 1.0` it respawns
  the particle (emitter + modifier snippets); otherwise it integrates it (update snippets).
- **Rendering:** two modes —
  - `billboard`: `Points` + `gl_PointSize` (cheap sprites).
  - `instanced`: `InstancedMesh` with real geometry, including an `onBeforeCompile` path
    that injects particle position/rotation/scale into a **stock Three.js material**
    (lit / matcap / physical), driven by the state texture.
- **Authoring:** a plugin system. Plugins are JS functions returning GLSL string snippets
  (`fragVars`, `fragFunc`, `vertVars`, `vertFunc`), uniforms, and a `requires` list of
  shared helper functions (`curl`, `voronoi`, `pillow`, …). `mergePluginData` concatenates
  the snippets, merges uniforms, and dedupes the required helpers into the final shader.
- **Particle count** is fixed per system = `size * size` (size 8–512, so up to ~262k).
  Every texel is a permanently-cycling particle. Scale by instantiating more systems,
  not by growing one.

## What's good

- **Correct GPGPU core.** Float textures, nearest filtering, clamp wrapping, MRT single-pass
  state+rotation+meta update, clean double-buffer via the `ParticleSource<T>` generic.
- **Plugin/composition layer is the standout.** Composing an effect from
  `[turbulence(), attractor(), colorOverLife(), sizeOverLife()]` and having it compile into
  one shader is expressive, and the plugin library is broad (turbulence variants, tornado,
  attractors with weights/offsets/masks, plane barriers, stream velocity, curl-noise fields,
  gradient-driven over-life curves).
- **`handleProp` const-or-uniform pattern** is the cleverest idea: same call site either
  bakes a constant into GLSL as a literal (compiler folds it, no uniform cost) or wires a
  live uniform. Big ergonomic win.
- **Stock-material lighting via `onBeforeCompile`** is the real differentiator — most
  homegrown systems only do additive point sprites.
- Nice touches: preheat with staggered negative ages (particles don't all pop on frame 1),
  Fibonacci-spiral emitters, FGA vector-field loader → `Data3DTexture`, gradient lookup
  textures for over-life curves.

## What's weak

- **String-concat codegen has no namespacing guarantees.** The existence of
  `PaticlePluginsEmitter_efficient.ts` (which suffixes local vars, `dist` → `dist_${id}`)
  is direct evidence this was hit in practice. The non-efficient file is still present and
  still unsafe. Errors surface as opaque GLSL compile failures — the fundamental tax of the
  approach.
- **Global singleton uniforms** (`uTime`, `uDeltaTime`, `uResolution`, `tNoise` in
  `uniforms.ts`). Can't run two systems on different clocks; `window.innerWidth` read at
  import is SSR-hostile and resize handling lives elsewhere.
- **No delta-time clamp.** A frame hitch feeds a huge `uDeltaTime` in → attractors overshoot,
  turbulence explodes, particles teleport.
- **`_ready` frame-skip hack** in `ParticleScene` works but is fragile (its ancestor was a
  `setTimeout(2000)`).
- **No GPU sort** → genuinely alpha-blended (non-additive) billboards will pop in depth.
  Fine for additive.
- **Emission model is "respawn every texel in place"** — great for continuous effects (fire,
  smoke, ambient), awkward for one-shot bursts of exactly N particles.

## Verdict

Capable and expressive; clearly battle-tested by its author (tuned constants, shipped
visuals). **Not yet a drop-in reusable library for others**: opaque failure modes, broken
un-exercised plugins sitting next to working ones, unsafe disposal, and two parallel emitter
files signalling the codegen namespacing was patched rather than solved. The gap to "usable
by others" is authoring ergonomics and hardening, not the shader core. Architecturally it's
the same family as `GPUComputationRenderer`, but with a much nicer authoring layer; a
WebGPU/TSL rewrite would eliminate the whole class of string-concat bugs while keeping the
plugin abstraction almost intact.

---

# TODO

## Bugs (should fix — several won't compile)

- [x] **`turbulenceV2`** — dangling `+` removed; `curl(position * curlSize, uTime * speed, .5)`.
- [x] **`rand()`** in helpers.glsl.ts — rewritten as a true single-float hash
      (`fract(sin(p * 269.5) * 43758.5453)`); note it's still not wired into `Extensions`/
      `ParticleExtensions`, so it remains unreachable dead code even though it now compiles.
- [x] **Preheat indexing** — `preheat[i]` → `preheat[i >> 2]` in `ParticleUpdateMaterial`.
- [x] **`dispose()` disposes shared textures.** Rewrote both materials to track an explicit
      `_ownedTextures` Set (populated only for textures actually created inside the
      constructor) instead of walking+disposing every texture uniform. Fixes `tNoise`, the
      emitter's default/meta/rotation textures, and — found while fixing this — the render
      material was also disposing `tStateTexture`/render-target textures it never owned.
- [x] **`RGBFormat` removed in modern three** — switched to `RGBAFormat` in
      `create3DGradientDataTexture`, stride bumped 3→4 floats/texel (alpha=1.0).

## Structural / hardening

- [x] **Consolidated the two emitter files** into `ParticlePluginsEmitter.ts` (typo fixed,
      `_efficient` suffix dropped). Ported `circlesStatic`/`circle` (missing from the
      efficient file) across unchanged. Found and fixed a bigger latent bug in the process:
      every emitter in the efficient file had silently dropped the `rotation` field entirely
      (`ParticleEmitterPlugin.rotation` was non-optional, so this didn't type-check and would
      have crashed at runtime). Made `rotation` optional on the type and added a
      `defaultRotations(size)` fallback (now in `Helpers.ts`) wherever it's consumed
      (`ParticleSystem.ts` ×2, `ParticleRenderMaterial.ts`).
- [x] **Clamped `uDeltaTime`** to `MAX_DELTA_TIME = 1/20` (50ms, ~3 frames@60fps) in
      `ParticleSystem.update()`.
- [x] **Per-system time/resolution.** `uTime`/`uDeltaTime` are no longer module singletons —
      removed from `uniforms.ts` entirely. Each `ParticleSystem` now owns its own clock
      (`_time` accumulator + `performance.now()`-derived delta, clamped) and writes it into
      its own materials' `uTime`/`uDeltaTime` uniforms every frame. `update(renderer,
      deltaTime?)` accepts an optional explicit deltaTime for caller-controlled clocks (pause/
      time-scale/fixed-step); falls back to wall-clock when omitted, and is always ignored
      when Three.js calls this as `onBeforeRender` (second arg would be the Scene, not a
      number — guarded via `typeof`). `flicker()` render plugin no longer supplies its own
      `uTime` value (material now always wins via merge order). `uResolution` (viewport size)
      stays a legitimate global singleton but now guards `window` for SSR and updates on
      `resize`.
- [x] **Replaced the `_ready` frame-skip** with an explicit two-pass init blit
      (`ParticleScene._initRenderTargets`): renders the seed data into both ping-pong targets
      once (with `uDeltaTime` forced to 0, so it's a pure passthrough) before the first real
      frame, so the normal update loop never special-cases frame 1.
- [x] **`metaTexture` sampled unconditionally** — `ParticleUpdateMaterial` now creates a 1×1
      zero-filled fallback texture when `metaTex` is undefined, so the shader always samples
      something valid.
- [ ] **(Optional) GPU sort** for non-additive/alpha-blended billboards (bitonic) — skipped.
      Nothing in the codebase currently uses that blend mode, so there's no concrete
      integration point to build/validate against; revisit if/when a non-additive use case
      shows up.

## Housekeeping

- [x] Filename typo fixed: `PaticlePlugins{Emitter,Render,Update}.ts` → `Particle*`
      (emitter also dropped the now-meaningless `_efficient` suffix in the same move).
- [x] Removed dead/commented code and unused imports: unused `mapLinear` import in
      `ParticleUpdateMaterial.ts`, the old `setTimeout` comment (gone with the `_ready`
      rewrite), several disabled `// if(age...){ }` wrapper comments and dead alternate-
      implementation lines across the emitter/render plugin files, debug `console.log`s.
      Found and fixed one real bug while doing this: `transform()` in
      `ParticlePluginsUpdate.ts` computed a transformed position but the line assigning it
      back to `position` was commented out — the plugin was a complete no-op.
- [x] Added minimal docs: each of the three plugin files now has a short header comment
      explaining its slot (spawn/update/render), when its GLSL snippet runs, and what
      variables are already in scope.

## Bigger bets (optional)

- [ ] Prototype a WebGPU/TSL port: storage buffers + compute shader for simulation, real
      functions instead of string concat. Port the plugin abstraction on top. Kills the whole
      codegen-bug class.
- [ ] A thin config/preset (builder) layer over the constructor to reduce per-effect
      boilerplate (`new Uniform(...)` wrapping, inline data-texture construction, positional
      plugin arrays).

---

# Editor (`editor/`)

A Vite + React + react-three-fiber visual editor for this engine, added as a sibling to
`ParticleSystem/`. JSON import/export of the full stack; drag-and-drop (`@dnd-kit`) from a
modifier library into four drop zones - Emitter / Spawn / Update / Render - matching the
engine's own plugin slots. Numeric/vector/color/gradient/texture params are Uniform-backed so
slider drags mutate `.value` in place instead of recompiling shaders; structural changes
(add/remove/reorder/enable-toggle, plain/matrix/circles-list params) trigger a full rebuild.
Param controls for the ~49 curated plugins live in `editor/src/engine/registry.ts`; anything
exported from the three `ParticlePlugins*.ts` files that isn't curated there still appears in
the library automatically via runtime introspection (function arity/defaults), with a raw-JSON
args fallback UI - new plugins don't need editor changes to become usable, just nicer controls.

**New engine plugin added via the editor:** `lineRasterAttractor()` in `ParticlePluginsUpdate.ts`
(update slot) - pulls particles toward a line in an evenly-spaced raster. Takes `spacing`,
`force`, an `axis` vec3 (`0` = inactive, `+1`/`-1` = active *and* one-directional - `{0,1,0}`
means horizontal lines that only ever pull upward (`ceil()` toward the next line up), never
back down toward one already passed; `{0,-1,0}` is the downward-only mirror; `{1,0,0}` = vertical
lines (snaps X, direction picked the same way). Combinable, e.g. `{1,0,1}` for pillars), `origin`,
and `falloffSize`/`falloffStrength` shaping how the pull decelerates near a line. Deliberately
uses `sign(delta)` instead of `normalize(delta)` for the per-axis pull direction - avoids the
NaN-at-zero-distance hazard that `normalize()` has and that some other attractors in this file
don't guard against. Registered in `editor/src/engine/registry.ts` with a `vec3` axis field
clamped to `{-1,0,1}` per component (step 1) since only the sign/zero-ness is meaningful.
Verified by reading back the GPU state texture (`renderer.readRenderTargetPixels`) and
confirming particle X coordinates cluster at `spacing` multiples rather than being uniformly
distributed (initial nearest-line version, before the one-directional change).

Switching the line pick from "nearest" (`round()`) to one-directional (`ceil()`/`floor()` per
the axis sign) broke visual clustering entirely at first: with the original `falloffSize=0`
default, force was applied at full strength regardless of distance, so a particle would sweep
straight through a line at constant speed and immediately re-target the next one - no pause, no
collecting. The old `round()` version had accidentally relied on oscillation for its clustering
look (a particle bounces back and forth *across* the nearest line, whichever side it's on,
since "nearest" flips as it crosses); the one-directional version has no such bounce to fall
back on, so real deceleration is required. Fixed by making speed ramp down (`pow(distFraction,
falloffStrength)`) as distance-to-target shrinks, instead of applying `force` at a constant
factor - `falloffSize` is now the distance that ramp spans (default `0.5`, not `0`) and
`falloffStrength` shapes the curve (1 = linear; higher = stays slow longer, snaps in tighter
right at the line; lower = eases off only at the very end).

Two real engine bugs found while wiring this up:

- [x] **`turbulence()`, `turbulenceV2()`, `turbulenceArea()`** called the `curl()` GLSL helper
  in their `fragFunc` but declared `requires:[]`, so `ParticleUpdateMaterial` never injected
  `curl`/`snoise4` and the shader failed to compile ("no matching overloaded function found").
  `turbulenceAreaVertical()` already had it right (`requires:['curl']`). Fixed directly in
  `ParticlePluginsUpdate.ts` (all three now declare `requires:['curl']`); removed the
  consumer-side `MISSING_REQUIRES` patch-up that had been living in
  `editor/src/engine/buildParticleSystem.ts` as a workaround.
- **Not a bug, but a sharp edge**: emitters (`rectangle`/`circle`/`circles`/`circlesStatic`)
  only seed `position` on respawn - nothing resets `age`. Without a spawn modifier that sets
  `age` (`constantSpawn()` is the trivial one; `killAreaRound`/`simpleNoise`/etc. do it
  conditionally), particles die once and never respawn, silently (no error, just an empty
  viewport since every particle's `relAge` sits > 1 forever). Worth a comment in
  `ParticlePluginsEmitter.ts` or a `console.warn` in `ParticleSystem` when `pluginsSpawn` is
  empty.

Also: `ParticleSystem` (the class) defaults to `visible = false` - the engine expects a
consumer to flip it on explicitly (e.g. after an orchestrated fade-in). The editor just sets
`system.visible = true` right after construction.

The engine's own root-level `~/Helpers` import (`convertToFloatingString`, `convertToVec3String`,
`convertToVec2String`, `convertColorToVec3String`, `makeid`, `generateFibonacciSpiral`,
`shuffleArray`, `fullDisposeObject3D`) was missing from disk - reconstructed at
`/Helpers.ts` (project root, sibling to `ParticleSystem/`) from call-site usage across the
plugin files. `generateFibonacciSpiral`'s exact original radius-tuple/bias semantics
(`[[min,max],[bias,...]]`) couldn't be recovered and are a best-effort reimplementation.

That reimplementation initially defaulted the radial bias exponent to `1` (linear
`r = maxR * t`), which visibly over-packed particles toward the center of `circle()`/`circles()`
emitters - ring area grows with `r`, so linear radius growth means point density falls off as
`1/r`. Fixed by defaulting bias to `0.5` (`r = maxR * sqrt(t)`), the standard sunflower/Vogel-
model radial law that gives uniform areal density. Verified by bucketing generated points into
concentric rings and confirming count-per-ring matches ring-area proportions (it now does,
exactly, across 6 test rings).
