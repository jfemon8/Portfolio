import { FFTR } from 'kissfft-js';

export function hannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / size));
  }
  return w;
}

// torch.stft's center=True convention: zero-pad n_fft/2 samples on both sides before framing.
function padCenter(signal: Float32Array, padAmount: number): Float32Array {
  const out = new Float32Array(signal.length + 2 * padAmount);
  out.set(signal, padAmount);
  return out;
}

// Each frame is n_fft/2+1 complex bins, interleaved [re0,im0,re1,im1,...] — kissfft-js's real-FFT packed format.
export function stft(
  signal: Float32Array,
  nFft: number,
  hop: number,
  window: Float32Array
): Float32Array[] {
  const padded = padCenter(signal, Math.floor(nFft / 2));
  const numFrames = 1 + Math.floor((padded.length - nFft) / hop);
  const fftr = new FFTR(nFft);
  const frames: Float32Array[] = [];
  const frameBuf = new Float32Array(nFft);
  for (let i = 0; i < numFrames; i++) {
    const start = i * hop;
    for (let j = 0; j < nFft; j++)
      frameBuf[j] = (padded[start + j] ?? 0) * window[j]!;
    frames.push(Float32Array.from(fftr.forward(frameBuf)));
  }
  fftr.dispose();
  return frames;
}

// Weighted overlap-add (normalizes by accumulated window^2, not a flat hop/window ratio) so edge frames with less overlap don't come out too quiet.
export function istft(
  frames: Float32Array[],
  nFft: number,
  hop: number,
  window: Float32Array,
  outputLength: number
): Float32Array {
  const fftr = new FFTR(nFft);
  const padAmount = Math.floor(nFft / 2);
  const paddedLength = outputLength + 2 * padAmount;
  const out = new Float32Array(paddedLength);
  const weight = new Float32Array(paddedLength);
  const scale = 1 / nFft;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]!;
    const scaled = Float32Array.from(frame, (v) => v * scale);
    const timeFrame = fftr.inverse(scaled);
    const start = i * hop;
    for (let j = 0; j < nFft; j++) {
      out[start + j]! += timeFrame[j]! * window[j]!;
      weight[start + j]! += window[j]! * window[j]!;
    }
  }
  fftr.dispose();

  for (let i = 0; i < out.length; i++) {
    if (weight[i]! > 1e-8) out[i]! /= weight[i]!;
  }
  return out.slice(padAmount, padAmount + outputLength);
}
