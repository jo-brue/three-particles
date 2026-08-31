import { BoxGeometry, BufferAttribute, BufferGeometry, Color, InstancedBufferAttribute, InstancedMesh, Material, Mesh, Points, ShaderMaterialParameters, SphereGeometry, Texture, Uniform, Vector2Like, Vector3Like, WebGLRenderer } from "three";
import ParticleDataTexture from "~/ParticleSystem/ParticleDataTexture";
import ParticleRenderMaterial from "~/ParticleSystem/ParticleRenderMaterial";
import ParticleRenderTargets from "~/ParticleSystem/ParticleRenderTargets";
import ParticleScene from "~/ParticleSystem/ParticleScene";
import { fullDisposeObject3D } from "~/Helpers";
import { defaultRotations } from "~/ParticleSystem/Helpers";

export type ParticleSystemSize = 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024;
export type ParticleRenderMode = 'billboard' | 'instanced';
export type Uniforms = {[key: string]: Uniform};
export type ParticleAttribute = [string, BufferAttribute];
export type ParticleExtensions = 'pillow' | 'voronoi' | 'PI' | 'curl' | 'randv2' | 'noise3d';
export type ParticleProp<T extends (number | Vector3Like | Vector2Like| Texture | Color )> = Uniform<T> | T;
export type ParticlePlugin = {
  fragVars?:string, 
  fragFunc?:string, 
  vertVars?:string, 
  vertFunc?:string, 
  uniforms:Uniforms, 
  requires:ParticleExtensions[], 
  metaData?: ParticleDataTexture 
};
export type ParticleEmitterPlugin = ParticlePlugin & {
  emitter:ParticleDataTexture,
  preheat?:number[],
  rotation?:ParticleDataTexture,
  emitterFragFunc:string,
  size: ParticleSystemSize
};
export type ParticleEmitterModifierPlugin = ParticlePlugin & { 
  modifierFragFunc:string 
};

// Caps per-frame deltaTime (~3 frames at 60fps) so a hitch/tab-switch can't feed a huge
// delta into simulation plugins (attractors overshooting, turbulence exploding, teleporting particles).
const MAX_DELTA_TIME = 1 / 20;

export type ParticleSystemProps = {
  emitter:ParticleEmitterPlugin,
  baseSize: number,
  autoUpdate?:boolean,
  materialProps?: ShaderMaterialParameters,
  renderOrder?:number,
  renderMode?: ParticleRenderMode,
  matcapTexture?: Texture,
  instancedMaterial?: Material,
  instancedMesh?: BufferGeometry,
}

export default class ParticleSystem extends Mesh{

  private _renderTargets:ParticleRenderTargets;
  private _scene:ParticleScene;
  private _geometry = new BufferGeometry();
  private _material;
  private _shaderUniforms?: any; // For materials using onBeforeCompile
  private readonly _size:ParticleSystemSize;
  private readonly _renderMode:ParticleRenderMode;
  override visible = false;

  // Per-instance clock so multiple particle systems can run independently (paused, time-scaled, etc).
  private _time = 0;
  private _lastFrameTimestamp: number | null = null;

  constructor(
    props: ParticleSystemProps, 
    pluginsSpawn: ParticleEmitterModifierPlugin[] = [],
    pluginsUpdate: ParticlePlugin[] = [],
    pluginsRender: ParticlePlugin[] = [],
    preHeat = 1
  ){
    super();

    this._size = props.emitter.size;
    this._renderMode = props.renderMode || 'billboard';

    this._renderTargets = new ParticleRenderTargets(this._size, + !!props.emitter.metaData as (0|1));

    const emitterRotation = props.emitter.rotation ?? defaultRotations(this._size);

    this._scene = new ParticleScene(
      props.emitter.emitter,
      emitterRotation,
      preHeat,
      props.emitter.metaData,
      [props.emitter, ...pluginsSpawn, ...pluginsUpdate],
      props.emitter.preheat
    );

    // Use native material for instanced mode if provided, otherwise use custom shader
    if (this._renderMode === 'instanced' && props.instancedMaterial) {
      this._material = this._setupInstancedMaterial(props, pluginsRender);
    } else {
      this._material = new ParticleRenderMaterial(props, pluginsRender, this._renderMode);
    }
    
    this.update = this.update.bind(this);
    // onBeforeRender's real signature is (renderer, scene, camera, geometry, material, group);
    // update()'s optional deltaTime would otherwise land in the "scene" slot when Three.js
    // invokes it that way, so bind a wrapper with the shape Three.js actually calls.
    const onBeforeRender = (renderer: WebGLRenderer) => this.update(renderer);

    if (this._renderMode === 'billboard') {
      // Billboard mode: use Points with point sprites
      const position = new Float32Array(this._size * this._size * 3);
      let i3;
      
      for(var i = 0; i < this._size * this._size; i++ ) {
        i3 = i * 3;
        position[i3 + 0] = (i % this._size) / this._size;
        position[i3 + 1] = ~~(i / this._size) / this._size;
      }
      
      this._geometry.setAttribute( 'position', new BufferAttribute( position, 3 ) );

      const _p = new Points(this._geometry, this._material);
      _p.frustumCulled = false;
      this.add(_p);
      props.renderOrder && (_p.renderOrder = props.renderOrder);
      
      props.autoUpdate && (_p.onBeforeRender = onBeforeRender);
    } else {
      // Instanced mode: use InstancedMesh with geometry
      const baseGeometry = props.instancedMesh || new BoxGeometry(1,1,1);
      
      // Create instance attributes for texture lookup coordinates
      const uvInstances = new Float32Array(this._size * this._size * 2);
      for(let i = 0; i < this._size * this._size; i++ ) {
        uvInstances[i * 2 + 0] = (i % this._size) / this._size;
        uvInstances[i * 2 + 1] = ~~(i / this._size) / this._size;
      }
      
      baseGeometry.setAttribute('instanceUV', new InstancedBufferAttribute(uvInstances, 2));
      
      const instancedMesh = new InstancedMesh(baseGeometry, this._material, this._size * this._size);
      instancedMesh.frustumCulled = false;
      this.add(instancedMesh);
      props.renderOrder && (instancedMesh.renderOrder = props.renderOrder);
      
      props.autoUpdate && (instancedMesh.onBeforeRender = onBeforeRender);
      
    }

  }

  private _setupInstancedMaterial(props: ParticleSystemProps, pluginsRender: ParticlePlugin[]) {
    const material = props.instancedMaterial!;
    const pluginData = this._mergePluginData(pluginsRender);
    const emitterRotation = props.emitter.rotation ?? defaultRotations(props.emitter.size);
    
    // Set custom program cache key to ensure our modified shader is used
    material.customProgramCacheKey = () => {
      return 'particle-system-' + material.uuid;
    };
    
    // Store original onBeforeCompile if it exists
    const originalOnBeforeCompile = material.onBeforeCompile.bind(material);
    
    material.onBeforeCompile = (shader, renderer) => {
      // Call original onBeforeCompile if it exists
      if (originalOnBeforeCompile) {
        originalOnBeforeCompile(shader, renderer);
      }
      
      // Store reference to shader uniforms for updates
      this._shaderUniforms = shader.uniforms;
      
      
      // Add particle system uniforms
      shader.uniforms.tStateTexture = { value: props.emitter.emitter };
      shader.uniforms.tStateTextureDefault = { value: props.emitter.emitter };
      shader.uniforms.tRotationTexture = { value: emitterRotation };
      shader.uniforms.uBaseSize = { value: props.baseSize };
      Object.assign(shader.uniforms, pluginData.uniforms);
      // Owned by this instance so multiple particle systems can run on independent clocks;
      // assigned after the plugin merge so it wins over any plugin-supplied uTime.
      shader.uniforms.uTime = { value: 0 };
      
      // Inject instance attribute and varyings into vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `
        uniform sampler2D tStateTexture;
        uniform sampler2D tStateTextureDefault;
        uniform sampler2D tRotationTexture;
        uniform float uBaseSize;
        attribute vec2 instanceUV;
        varying vec2 vInstanceId;
        varying float vRelAge;
        varying vec4 vState;
        varying float vSize;
        ${pluginData.vertVars || ''}
        
        void main() {
        `
      );
      
      // Inject particle state reading right at the start of main (after uv_vertex which is always there)
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>

        vInstanceId = instanceUV;
        
        // Particle system state - read early so it's available everywhere
        vState = texture2D(tStateTexture, instanceUV);
        vec4 defaultState = texture2D(tStateTextureDefault, instanceUV);
        vec4 rotationData = texture2D(tRotationTexture, instanceUV);
        vRelAge = vState.w / defaultState.w;
        
        // Initialize vSize for plugin modifications
        vSize = uBaseSize * 0.01;
        
        ${pluginData.vertFuncs || ''}
        `
      );
      
      // Scale and rotate the mesh in object space
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        
        // Apply particle scale in object space
        transformed = transformed * vSize;
        
        // Apply 3-axis rotation from rotation texture (xyz = cumulative angles in radians)
        // Angles stored as: rotationData.x = X-axis, rotationData.y = Y-axis, rotationData.z = Z-axis
        float angleX = rotationData.x;
        float angleY = rotationData.y;
        float angleZ = rotationData.z;
        
        // Rotation matrices (applied in order: X -> Y -> Z)
        float cx = cos(angleX);
        float sx = sin(angleX);
        float cy = cos(angleY);
        float sy = sin(angleY);
        float cz = cos(angleZ);
        float sz = sin(angleZ);
        
        // Rotate around X-axis
        vec3 rotatedX = vec3(
          transformed.x,
          transformed.y * cx - transformed.z * sx,
          transformed.y * sx + transformed.z * cx
        );
        
        // Rotate around Y-axis
        vec3 rotatedY = vec3(
          rotatedX.x * cy + rotatedX.z * sy,
          rotatedX.y,
          -rotatedX.x * sy + rotatedX.z * cy
        );
        
        // Rotate around Z-axis
        vec3 rotatedZ = vec3(
          rotatedY.x * cz - rotatedY.y * sz,
          rotatedY.x * sz + rotatedY.y * cz,
          rotatedY.z
        );
        
        transformed = rotatedZ;
        `
      );
      
      // Add particle position offset in local space before model transformation
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        // Add particle position in local space, then transform to world space
        vec4 _worldPosition = modelMatrix * vec4(transformed + vState.xyz, 1.0);
        
        // Then to view and projection space
        vec4 mvPosition = viewMatrix * _worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      );
      
      // Add fragment shader varyings and plugin support
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `
        varying float vRelAge;
        varying vec4 vState;
        varying vec2 vInstanceId;
        varying float vSize;
        ${pluginData.fragVars || ''}
        
        void main() {
        `
      );
      
      // Add discard logic and plugin functions
      // Note: Replace 'color' with 'diffuseColor' for Three.js material compatibility
      const adaptedFragFuncs = (pluginData.fragFuncs || '')
        .replace(/\bcolor\b/g, 'diffuseColor');
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        if (vRelAge >= 1.0 || vSize <= 0.0001) discard;
        
        #include <color_fragment>
        
        ${adaptedFragFuncs}
        `
      );
      
    };
    
    // Force material to recompile with our modified shader
    material.needsUpdate = true;
    
    return material;
  }
  
  private _mergePluginData(plugins: ParticlePlugin[]) {
    const merged = {
      uniforms: {} as Uniforms,
      vertVars: '',
      vertFuncs: '',
      fragVars: '',
      fragFuncs: ''
    };
    
    for (const plugin of plugins) {
      Object.assign(merged.uniforms, plugin.uniforms);
      if (plugin.vertVars) merged.vertVars += plugin.vertVars + '\n';
      if (plugin.vertFunc) merged.vertFuncs += plugin.vertFunc + '\n';
      if (plugin.fragVars) merged.fragVars += plugin.fragVars + '\n';
      if (plugin.fragFunc) merged.fragFuncs += plugin.fragFunc + '\n';
    }
    
    return merged;
  }

  // deltaTime is optional: pass it explicitly for a caller-controlled clock (pause, time-scale,
  // fixed-step sim); otherwise it's derived from wall-clock time between calls. Either way it's
  // clamped, and always ignored when this fires as a Three.js onBeforeRender callback (which
  // passes the Scene as the second argument, not a number).
  update(renderer:WebGLRenderer, deltaTime?:number){

    const now = performance.now();
    const rawDeltaTime = typeof deltaTime === 'number'
      ? deltaTime
      : this._lastFrameTimestamp === null ? 0 : (now - this._lastFrameTimestamp) / 1000;
    this._lastFrameTimestamp = now;

    const clampedDeltaTime = Math.min(Math.max(rawDeltaTime, 0), MAX_DELTA_TIME);
    this._time += clampedDeltaTime;

    this._scene.update(renderer, this._renderTargets, this._time, clampedDeltaTime);
    this._renderTargets.swap();

    // Update texture uniforms (works for both custom shader and onBeforeCompile materials)
    if (this._shaderUniforms) {
      // Native material with onBeforeCompile
      this._shaderUniforms.tStateTexture.value = this._renderTargets.current.textures[0];
      this._shaderUniforms.tRotationTexture.value = this._renderTargets.current.textures[1];
      this._shaderUniforms.uTime.value = this._time;
    } else if (this._material instanceof ParticleRenderMaterial) {
      // Custom ParticleRenderMaterial
      this._material.uniforms.tStateTexture.value = this._renderTargets.current.textures[0];
      this._material.uniforms.uTime.value = this._time;
    }

  }

  dispose(){

    fullDisposeObject3D(this);
    this._scene.dispose();
    this._renderTargets.dispose();
    this._material.dispose();

  }

}