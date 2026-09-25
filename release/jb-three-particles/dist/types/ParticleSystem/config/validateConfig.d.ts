import { ParticleSystemConfig } from './configTypes';
/** Normalizes a parsed particle-editor JSON export into a full ParticleSystemConfig, filling in
 *  defaults for anything missing. Throws if the value isn't a config at all. */
export declare function validateConfig(value: unknown): ParticleSystemConfig;
