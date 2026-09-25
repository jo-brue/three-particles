export default class ParticleSource<T extends {
    clone: () => T;
}> {
    protected _d: [T, T];
    get current(): T;
    get next(): T;
    constructor(object: T);
    swap(): void;
}
