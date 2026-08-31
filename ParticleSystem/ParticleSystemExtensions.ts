import { curl, noise3d, PI, pillow, randv2, voronoi } from "~/ParticleSystem/glsl/helpers.glsl";
import { ParticleExtensions } from "~/ParticleSystem/ParticleSystem";

export const Extensions:{[key in ParticleExtensions]:string} = {
  pillow,
  voronoi,
  PI,
  curl,
  randv2,
  noise3d
}