import { RepeatWrapping, TextureLoader, Uniform, Vector2 } from "three";

const hasWindow = typeof window !== 'undefined';

// Viewport resolution: legitimately global (every system on screen shares one viewport).
export const uResolution = new Uniform(new Vector2(
  hasWindow ? window.innerWidth : 1,
  hasWindow ? window.innerHeight : 1
));

if(hasWindow){
  window.addEventListener('resize', () => {
    uResolution.value.set(window.innerWidth, window.innerHeight);
  });
}

// Shared noise texture: legitimately global, flagged so material dispose() never frees it.
export const tNoise = new Uniform(new TextureLoader().load('/assets/textures/noise.png', (tex) => {
  tex.wrapT = RepeatWrapping;
  tex.wrapS = RepeatWrapping;
  tex.name = 'noise.png';
  tex.userData.isGlobal = true;
  tex.generateMipmaps = false;
}));

// uTime/uDeltaTime are intentionally NOT exported here: each ParticleSystem owns its
// own clock (see ParticleSystem.ts) so multiple systems can run independently.
