declare module 'kissfft-js' {
  export class FFTR {
    constructor(size: number);
    forward(real: Float32Array): Float32Array;
    inverse(complex: Float32Array): Float32Array;
    dispose(): void;
  }
}
