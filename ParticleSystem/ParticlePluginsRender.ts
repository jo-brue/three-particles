import { Color, Matrix4, Texture, Uniform, Vector2Like, Vector3, Vector3Like } from "three";
import { handleProp, handleUniformProp } from "~/ParticleSystem/Helpers";
import { ParticlePlugin, ParticleProp, Uniforms } from "~/ParticleSystem/ParticleSystem";
import { convertColorToVec3String, convertToFloatingString, convertToVec2String, convertToVec3String, makeid } from "~/Helpers";
import { tNoise } from "~/ParticleSystem/uniforms";

// "render" slot plugins: passed as pluginsRender to `new ParticleSystem(...)`. Each plugin's
// fragFunc runs once per particle per frame in the render material, mutating `color` (vec4).
// vertFunc runs in the vertex stage and can mutate `vSize`/`vPosition` before rasterization.



export function colorOverLife(tex:Uniform<Texture>):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {
    ['tColorOverLife_'+id]: tex
  };

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      uniform sampler2D tColorOverLife_${id};
    `,

    fragFunc:/*glsl*/`
      color *= vec4(texture2D(tColorOverLife_${id}, vec2(0, 1.0 - vRelAge)));
    `

  }
}

export function colorRing(
  color:Uniform<Color>,
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
):ParticlePlugin{

  const id = makeid(4);
  
  const uniforms:Uniforms = {};
  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ colorUniformVarString, colorVarString] = handleUniformProp(color, uniforms, 'color', id, 'vec3');
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ colorUniformVarString }
    `,

    fragFunc:/*glsl*/`

      float fac_${id} = smoothstep(.9, 1.0, distance(${ positionVarString }, vState.xyz) / ${ sizeVarString });

      color = mix(color, vec4(${ colorVarString } , color.a), fac_${id});
      
    `

  }
}

export function round():ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {
  };

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
    `,

    fragFunc:/*glsl*/`
      vec2 coord_${id} = gl_PointCoord * 2.0 - 1.0;
      if ( dot(coord_${id}, coord_${id}) > 1.0) discard;
    `

  }
}

export function textured(tex:Uniform<Texture>):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {
    ['tParticle_'+id]: tex
  };

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      uniform sampler2D tParticle_${id};
    `,

    fragFunc:/*glsl*/`
      color = texture2D(tParticle_${id}, gl_PointCoord);
    `

  }
}

export function flicker(speed: ParticleProp<number>):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {
    tNoise
  };

  const [ speedUniformVarString, speedVarString] = handleProp(speed, uniforms, 'speed', id, 'float', convertToFloatingString);

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      uniform sampler2D tNoise;
      uniform float uTime;
      ${speedUniformVarString}
    `,

    fragFunc:/*glsl*/`
      color *= texture2D(tNoise , gl_PointCoord * vec2(.01) + uTime * ${ speedVarString } + vPosition.xz ).r;
    `

  }
}

export function soft(contrast:ParticleProp<Vector2Like>):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const [ contrastUniformVarString, contrastVarString] = handleProp(contrast, uniforms, 'contrast', id, 'vec2', convertToVec2String);

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${contrastUniformVarString}
    `,

    fragFunc:/*glsl*/`
      color = vec4(1.0 - smoothstep( ${ contrastVarString }.x, ${ contrastVarString }.y, length(gl_PointCoord - vec2(.5)) * 2.0 ));
    `

  }
}

export function color(col:Uniform<Color>):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const [ colorUniformVarString, colorVarString] = handleUniformProp(col, uniforms, 'color', id, 'vec3');


  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ colorUniformVarString }
    `,

    fragFunc:/*glsl*/`
      color *= vec4( ${ colorVarString }, 1.0);
    `

  }
}

export function colorFromLookup(
  tex:Uniform<Texture>
):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const [ colorUniformVarString, colorVarString] = handleUniformProp(tex, uniforms, 'colorFromLookup', id, 'sampler2D');;


  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ colorUniformVarString }
    `,

    fragFunc:/*glsl*/`
      color *= texture2D(${ colorVarString }, vInstanceId);
    `

  }
}

export function switchGeometries(threshhold: number):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};


  return {
    
    uniforms,

    requires:[],

    vertVars:/*glsl*/`
      attribute float aGeoIndex;
    `,

    vertFunc:/*glsl*/`
      // in begin_vertex or after transforms:
      float desiredGeo = step(${convertToFloatingString(threshhold)}, vRelAge); // example: switch geo based on age
      if (aGeoIndex != desiredGeo) {
          vSize = 0.0;
      }
    `,

  }
}

export function colorArea(
  color:ParticleProp<Color>, 
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>
):ParticlePlugin{

  const id = makeid(4);
  
  const uniforms:Uniforms = {};

  const [ colorUniformVarString, colorVarString] = handleProp(color, uniforms, 'color', id, 'vec3', convertColorToVec3String);
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ colorUniformVarString }
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
    `,

    fragFunc:/*glsl*/`

      float dir_${ id } = clamp(length((vState.xyz  - ${ positionVarString }).xz) / ${ sizeVarString }, .0, 1.0);

      color = mix(vec4(${ colorVarString } , color.a), color, dir_${ id });
      
    `

  }
}

// Samples using vPosition.xy - the particle's fixed slot in the state texture grid, assigned
// once at spawn and never touched again, so the sampled color is frozen for that particle's
// whole life regardless of where it moves. No plane/position param, unlike
// sampleFromImageContinuous below: there's nothing to project, vPosition.xy is already a flat
// 2D coordinate spanning the whole particle grid. `size`/`aspect` still apply here though - they
// scale that lookup around the grid's center (0.5, 0.5), so the image can be zoomed in (size < 1,
// crops toward the middle) or out (size > 1, shrinks toward the middle, clamped edge color
// filling the rest) without needing a world-space plane. Kept as two independent scalars rather
// than one vec2 - `size` (overall scale) and `aspect` (width:height) - so resizing doesn't also
// distort the image and adjusting aspect doesn't also change how big it reads: actual per-axis
// scale is `size*aspect` horizontally, `size/aspect` vertically, so the two stay decoupled and
// aspect=1 always means "whatever size says, applied evenly." This is the non-continuous sibling
// of sampleFromImageContinuous, and is what sampleFromImage (further down, now legacy) should
// have been without its unrelated, buggy `transform` render-position feature bolted on.
// `ignoreAlpha` (compile-time, like killAreaRound's `invert`) skips the overwrite wherever the
// sampled texel's alpha is 0, leaving whatever color an earlier render modifier already set -
// so a PNG with transparent regions can act as a stencil/mask instead of punching those
// particles to fully-transparent black.
export function sampleFromImageAtSpawn(tex:Uniform<Texture>, size:ParticleProp<number>, aspect:ParticleProp<number>, ignoreAlpha:boolean = false):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const [ texUniformVarString, texVarString ] = handleUniformProp(tex, uniforms, 'sampleFromImageAtSpawn', id, 'sampler2D');
  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ aspectUniformVarString, aspectVarString ] = handleProp(aspect, uniforms, 'aspect', id, 'float', convertToFloatingString);

  return {

    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ texUniformVarString }
      ${ sizeUniformVarString }
      ${ aspectUniformVarString }
    `,

    fragFunc:/*glsl*/`
      vec2 scale_${ id } = vec2( ${ sizeVarString } * ${ aspectVarString }, ${ sizeVarString } / ${ aspectVarString } );
      vec2 scaledUv_${ id } = (vPosition.xy - 0.5) / scale_${ id } + 0.5;
      vec4 sampled_${ id } = texture2D(${ texVarString }, scaledUv_${ id });
      ${ ignoreAlpha ? /*glsl*/`if (sampled_${ id }.a > 0.0) { color = sampled_${ id }; }` : /*glsl*/`color = sampled_${ id };` }
    `

  }
}

// Legacy - kept only so previously-saved configs that reference it by name keep working.
// Superseded by sampleFromImageAtSpawn (same sampling behavior, minus the `transform` param,
// which repositioned the rendered particle rather than affecting the image sample at all -
// an unrelated feature that didn't belong on this plugin, and whose vertFunc had a compile
// bug referencing an undeclared `state` instead of `vState`).
export function sampleFromImage(tex:Uniform<Texture>, transform?:Uniform<Matrix4>):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const [ texUniformVarString, texVarString ] = handleUniformProp(tex, uniforms, 'sampleFromImage', id, 'sampler2D');
  let [ transformUniformVarString, transformVarString ] = ['', ''];
  transform && ( [ transformUniformVarString, transformVarString ] = handleUniformProp(transform, uniforms, 'transform', id, 'mat4') );

  const vertFunc = transform ? /*glsl*/`mvPosition = viewMatrix * ${ transformVarString } * vec4( vState.xyz , 1.0 );` : '';

  return {
    
    uniforms,

    requires:[],

    vertVars:/*glsl*/`
      ${ transformUniformVarString }
    `,

    vertFunc,

    fragVars:/*glsl*/`
      ${ texUniformVarString }
    `,

    fragFunc:/*glsl*/`
      color = vec4(texture2D(${ texVarString }, vPosition.xy));
    `

  }
}

// sampleFromImageAtSpawn above samples using vPosition.xy - the particle's fixed slot in the
// state texture grid, assigned once at spawn and never touched again, so the sampled color is
// frozen for that particle's whole life regardless of where it moves. This variant instead
// projects the particle's *current* position (vState.xyz, updated every frame by the
// simulation) onto a chosen world-space plane to build the UV, so particles pick up whatever
// part of the image they're currently passing over - a spatial projection rather than a
// per-particle constant. `plane` picks which two axes become UV.xy and is baked into the
// generated GLSL swizzle at build time (not a runtime uniform), since GLSL swizzles aren't
// dynamically selectable. `size`/`aspect` are two independent scalars rather than one vec2 -
// `size` (overall world-space extent) and `aspect` (width:height) - so resizing the plane
// doesn't also distort the image and adjusting aspect doesn't also change how big the plane
// reads: actual per-axis extent is `size*aspect` on the plane's first axis, `size/aspect` on
// its second, so the two stay decoupled and aspect=1 always means "whatever size says, applied
// evenly" (matches sampleFromImageAtSpawn's size/aspect above). `ignoreAlpha` (compile-time,
// like killAreaRound's `invert`) skips the overwrite wherever the sampled texel's alpha is 0,
// leaving whatever color an earlier render modifier already set - so a PNG with transparent
// regions can act as a stencil/mask instead of punching those particles to fully-transparent
// black.
export function sampleFromImageContinuous(
  tex: Uniform<Texture>,
  position: ParticleProp<Vector3Like>,
  size: ParticleProp<number>,
  aspect: ParticleProp<number>,
  plane: 'xy' | 'xz' | 'yz' = 'xy',
  ignoreAlpha: boolean = false,
): ParticlePlugin {

  const id = makeid(4);

  const uniforms: Uniforms = {};

  const [ texUniformVarString, texVarString ] = handleUniformProp(tex, uniforms, 'sampleFromImageContinuous', id, 'sampler2D');
  const [ positionUniformVarString, positionVarString ] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ aspectUniformVarString, aspectVarString ] = handleProp(aspect, uniforms, 'aspect', id, 'float', convertToFloatingString);

  return {

    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ texUniformVarString }
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ aspectUniformVarString }
    `,

    fragFunc:/*glsl*/`
      vec2 scale_${ id } = vec2( ${ sizeVarString } * ${ aspectVarString }, ${ sizeVarString } / ${ aspectVarString } );
      vec2 projectedUv_${ id } = (vState.${ plane } - ${ positionVarString }.${ plane }) / scale_${ id } + 0.5;
      vec4 sampled_${ id } = texture2D(${ texVarString }, projectedUv_${ id });
      ${ ignoreAlpha ? /*glsl*/`if (sampled_${ id }.a > 0.0) { color = sampled_${ id }; }` : /*glsl*/`color = sampled_${ id };` }
    `

  }
}

export function sizeOverLife(tex:Uniform<Texture>):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {
    ['tSizeOverLife_'+id]: tex
  };

  return {
    
    uniforms,

    requires:[],

    vertVars:/*glsl*/`
      uniform sampler2D tSizeOverLife_${id};
    `,

    vertFunc:/*glsl*/`
      float sizeOl = texture2D(tSizeOverLife_${id}, vec2(0, vRelAge)).r;
      vSize *= sizeOl;
    `

  }
}

// Size counterpart of the simpleNoise3D spawn modifier: same evolving 3D noise over the
// (pixelated) particle grid, but instead of gating spawns it shrinks particles where the noise
// is low. `smoothness` (0..1) is the width of the fade between hidden and full size (0 = hard
// edge). `amount` (0..1) slides that fade band across the noise range: 0 = every particle
// hidden, 1 = every particle full size, whatever the smoothness - so it can be animated to
// reveal/hide the whole pattern. `minScale` is the size where the pattern is "hidden" (0 =
// gone, 1 = no effect).
export function simpleNoise3DScale(
  noiseSpeed: ParticleProp<number>,
  noiseScale: ParticleProp<number>,
  pixelate: ParticleProp<number>,
  smoothness: ParticleProp<number>,
  amount: ParticleProp<number>,
  minScale: ParticleProp<number> = 0
):ParticlePlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ noiseSpeedUniformVarString, noiseSpeedVarString ] = handleProp(noiseSpeed, _uniforms, 'noiseSpeed', id, 'float', convertToFloatingString);
  const [ noiseScaleUniformVarString, noiseScaleVarString ] = handleProp(noiseScale, _uniforms, 'noiseScale', id, 'float', convertToFloatingString);
  const [ pixelateUniformVarString, pixelateVarString ] = handleProp(pixelate, _uniforms, 'pixelate', id, 'float', convertToFloatingString);
  const [ smoothnessUniformVarString, smoothnessVarString ] = handleProp(smoothness, _uniforms, 'smoothness', id, 'float', convertToFloatingString);
  const [ amountUniformVarString, amountVarString ] = handleProp(amount, _uniforms, 'amount', id, 'float', convertToFloatingString);
  const [ minScaleUniformVarString, minScaleVarString ] = handleProp(minScale, _uniforms, 'minScale', id, 'float', convertToFloatingString);

  return {

    uniforms: _uniforms,

    requires:['noise3d'],

    vertVars:/*glsl*/`
      ${ noiseSpeedUniformVarString }
      ${ noiseScaleUniformVarString }
      ${ pixelateUniformVarString }
      ${ smoothnessUniformVarString }
      ${ amountUniformVarString }
      ${ minScaleUniformVarString }
    `,

    vertFunc:/*glsl*/`

      float pixelSamples_${ id } = max(1.0, ${ pixelateVarString });
      vec2 pixelUv_${ id } = floor(vInstanceId * pixelSamples_${ id }) / pixelSamples_${ id };
      // snoise3d returns roughly [-1,1] - remap to [0,1] like simpleNoise3D.
      float noise_${ id } = snoise3d(vec3(pixelUv_${ id } * ${ noiseScaleVarString }, uTime * ${ noiseSpeedVarString })) * 0.5 + 0.5;
      // Band center runs from just above the noise range (amount 0, all hidden) to just below
      // it (amount 1, all shown) - offset by half the band so its ends fully clear 0..1.
      float halfBand_${ id } = max( ${ smoothnessVarString }, 0.0001 ) * 0.5;
      float center_${ id } = mix( 1.0 + halfBand_${ id }, -halfBand_${ id }, ${ amountVarString } );
      float mask_${ id } = smoothstep( center_${ id } - halfBand_${ id }, center_${ id } + halfBand_${ id }, noise_${ id } );
      vSize *= mix( ${ minScaleVarString }, 1.0, mask_${ id } );

    `

  }
}

// Shared tail of scaleArea / scaleAreaBox: `distExpr` is the particle's distance from the
// area's center normalized to its edge (1.0 = on the boundary). By default it multiplies
// whatever size earlier render plugins produced; with `set`, it overrides it with base size *
// scale inside the area instead (so e.g. sizeOverLife / noise scale are ignored there),
// blending back out over the falloff. `falloff` is the fraction of the area, measured inward
// from the edge, over which the effect fades out: 0 = hard edge, 1 = fades all the way from
// the center. `amount` blends the whole effect in: 0 = no effect, 1 = full effect. `invert`
// applies the scale outside the area instead of inside it.
function scaleByArea(id: string, distExpr: string, scaleVarString: string, falloffVarString: string, amountVarString: string, set: boolean, invert: boolean): string {
  return /*glsl*/`

      // Inner edge clamped just below 1 so falloff 0 is a hard step instead of undefined.
      float falloff_${ id } = ${ invert ? '1.0 - ' : '' }smoothstep(min(1.0 - ${ falloffVarString }, 0.9999), 1.0, ${ distExpr });
      // How strongly this particle is affected: 1 deep inside the area at full amount, 0 outside.
      float weight_${ id } = (1.0 - falloff_${ id }) * ${ amountVarString };
      ${ set
        ? `vSize = mix( vSize, vSizeBase * ${ scaleVarString }, weight_${ id } );`
        : `vSize *= mix( 1.0, ${ scaleVarString }, weight_${ id } );` }

    `;
}

// Spherical area around `position` with radius `size` - see scaleByArea for the options.
export function scaleArea( 
  position: ParticleProp<Vector3>,
  size: ParticleProp<number>,
  scale: ParticleProp<number>,
  falloff: ParticleProp<number> = 0.6,
  amount: ParticleProp<number> = 1,
  set = false,
  invert = false,
):ParticlePlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ positionUniformVarString, positionVarString ] = handleProp(position, _uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, _uniforms, 'size', id, 'float', convertToFloatingString);
  const [ scaleUniformVarString, scaleVarString ] = handleProp(scale, _uniforms, 'scale', id, 'float', convertToFloatingString);
  const [ falloffUniformVarString, falloffVarString ] = handleProp(falloff, _uniforms, 'falloff', id, 'float', convertToFloatingString);
  const [ amountUniformVarString, amountVarString ] = handleProp(amount, _uniforms, 'amount', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:[],

    vertVars:/*glsl*/`
      ${ sizeUniformVarString }
      ${ positionUniformVarString }
      ${ scaleUniformVarString }
      ${ falloffUniformVarString }
      ${ amountUniformVarString }
    `,

    vertFunc: scaleByArea(id, `distance( ${positionVarString}, defaultState.xyz ) / ${ sizeVarString }`, scaleVarString, falloffVarString, amountVarString, set, invert),

  }
}

// Axis-aligned box around `position`, `size` = half-extents per axis (center to edge) - see
// scaleByArea for the options. The falloff is measured per axis relative to each half-extent,
// so on a non-cubic box the fade band is proportionally wider along the longer axes.
export function scaleAreaBox( 
  position: ParticleProp<Vector3>,
  size: ParticleProp<Vector3>,
  scale: ParticleProp<number>,
  falloff: ParticleProp<number> = 0.6,
  set = false,
  invert = false,
):ParticlePlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ positionUniformVarString, positionVarString ] = handleProp(position, _uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, _uniforms, 'size', id, 'vec3', convertToVec3String);
  const [ scaleUniformVarString, scaleVarString ] = handleProp(scale, _uniforms, 'scale', id, 'float', convertToFloatingString);
  const [ falloffUniformVarString, falloffVarString ] = handleProp(falloff, _uniforms, 'falloff', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:[],

    vertVars:/*glsl*/`
      ${ sizeUniformVarString }
      ${ positionUniformVarString }
      ${ scaleUniformVarString }
      ${ falloffUniformVarString }
    `,

    vertFunc: /*glsl*/`
      // Largest per-axis distance relative to the half-extent - 1.0 on the box's surface.
      vec3 boxDist_${ id } = abs( defaultState.xyz - ${ positionVarString } ) / max( ${ sizeVarString }, vec3(0.0001) );
      ${ scaleByArea(id, `max( boxDist_${ id }.x, max( boxDist_${ id }.y, boxDist_${ id }.z ) )`, scaleVarString, falloffVarString, '1.0', set, invert) }
    `,

  }
}