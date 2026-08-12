import * as ort from 'onnxruntime-web';
import { hannWindow, stft, istft } from '../lib/audio/stft';
import type { WorkerRequest, WorkerMessage } from './vocalRemover.types';

ort.env.wasm.wasmPaths =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

const MODEL_URL =
  'https://huggingface.co/Politrees/UVR_resources/resolve/main/models/MDXNet/UVR-MDX-NET-Voc_FT.onnx';
const MODEL_CACHE_KEY = 'vocal-remover-model-v1';

const N_FFT = 7680;
const HOP = 1024;
const DIM_T = 256;
const DIM_F = 3072;
const N_BINS = N_FFT / 2 + 1;
const COMPENSATE = 1.021;
const CHUNK_SIZE = HOP * (DIM_T - 1);
const TRIM = N_FFT / 2;
const GEN_SIZE = CHUNK_SIZE - 2 * TRIM;
// ~0.19s of shared audio between chunks, costing ~3% more inference for seam-free joins.
const OVERLAP = 8192;

const window = hannWindow(N_FFT);

function post(message: WorkerMessage, transfer: Transferable[] = []): void {
  (self as unknown as Worker).postMessage(message, transfer);
}

async function fetchModelBytes(): Promise<ArrayBuffer> {
  const cache = await caches.open(MODEL_CACHE_KEY);
  const cached = await cache.match(MODEL_URL);
  if (cached) return cached.arrayBuffer();

  const response = await fetch(MODEL_URL);
  if (!response.ok || !response.body) {
    throw new Error(
      `Could not download the separation model (HTTP ${response.status}).`
    );
  }
  const total = Number(response.headers.get('content-length') ?? 0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    post({ type: 'model-progress', loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  await cache.put(MODEL_URL, new Response(bytes));
  return bytes.buffer;
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;
function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= fetchModelBytes().then((bytes) =>
    ort.InferenceSession.create(bytes, {
      executionProviders: ['webgpu', 'wasm'],
    })
  );
  return sessionPromise;
}

interface FrameBins {
  re: Float32Array;
  im: Float32Array;
}

// Deinterleaves kissfft-js's packed [re0,im0,re1,im1,...] output into separate real/imaginary arrays.
function deinterleave(frame: Float32Array): FrameBins {
  const re = new Float32Array(N_BINS);
  const im = new Float32Array(N_BINS);
  for (let b = 0; b < N_BINS; b++) {
    re[b] = frame[b * 2]!;
    im[b] = frame[b * 2 + 1]!;
  }
  return { re, im };
}

function interleave(re: Float32Array, im: Float32Array): Float32Array {
  const out = new Float32Array(N_BINS * 2);
  for (let b = 0; b < N_BINS; b++) {
    out[b * 2] = re[b]!;
    out[b * 2 + 1] = im[b]!;
  }
  return out;
}

// Leading silence puts the first chunk's discarded edge outside the real audio; the tail zero-fills to the last chunk.
function padMixtureChannel(
  samples: Float32Array,
  trim: number,
  paddedLength: number
): Float32Array {
  const out = new Float32Array(Math.max(paddedLength, trim + samples.length));
  out.set(samples, trim);
  return out;
}

async function infer(
  session: ort.InferenceSession,
  inputData: Float32Array
): Promise<Float32Array> {
  const tensor = new ort.Tensor('float32', inputData, [1, 4, DIM_F, DIM_T]);
  const outputs = await session.run({ input: tensor });
  // Copied out of the runtime's own memory, which the next run would otherwise overwrite.
  return Float32Array.from(outputs.output!.data as Float32Array);
}

async function runChunk(
  session: ort.InferenceSession,
  leftChunk: Float32Array,
  rightChunk: Float32Array,
  denoise: boolean
): Promise<{ left: Float32Array; right: Float32Array }> {
  const leftFrames = stft(leftChunk, N_FFT, HOP, window).map(deinterleave);
  const rightFrames = stft(rightChunk, N_FFT, HOP, window).map(deinterleave);

  const inputData = new Float32Array(4 * DIM_F * DIM_T);
  for (let t = 0; t < DIM_T; t++) {
    const l = leftFrames[t]!;
    const r = rightFrames[t]!;
    for (let f = 0; f < DIM_F; f++) {
      // Model's lowest 3 frequency bins are zeroed on input — it was never trained to see energy there.
      const zeroed = f < 3;
      inputData[0 * DIM_F * DIM_T + f * DIM_T + t] = zeroed ? 0 : l.re[f]!;
      inputData[1 * DIM_F * DIM_T + f * DIM_T + t] = zeroed ? 0 : l.im[f]!;
      inputData[2 * DIM_F * DIM_T + f * DIM_T + t] = zeroed ? 0 : r.re[f]!;
      inputData[3 * DIM_F * DIM_T + f * DIM_T + t] = zeroed ? 0 : r.im[f]!;
    }
  }

  const outputData = await infer(session, inputData);
  if (denoise) {
    // Averaging the prediction with the negated-input prediction cancels artefacts the model adds regardless of sign.
    const negated = await infer(
      session,
      Float32Array.from(inputData, (v) => -v)
    );
    for (let i = 0; i < outputData.length; i++) {
      outputData[i] = (outputData[i]! - negated[i]!) * 0.5;
    }
  }

  const leftOutFrames: Float32Array[] = [];
  const rightOutFrames: Float32Array[] = [];
  for (let t = 0; t < DIM_T; t++) {
    const lRe = new Float32Array(N_BINS);
    const lIm = new Float32Array(N_BINS);
    const rRe = new Float32Array(N_BINS);
    const rIm = new Float32Array(N_BINS);
    for (let f = 0; f < DIM_F; f++) {
      lRe[f] = outputData[0 * DIM_F * DIM_T + f * DIM_T + t]! * COMPENSATE;
      lIm[f] = outputData[1 * DIM_F * DIM_T + f * DIM_T + t]! * COMPENSATE;
      rRe[f] = outputData[2 * DIM_F * DIM_T + f * DIM_T + t]! * COMPENSATE;
      rIm[f] = outputData[3 * DIM_F * DIM_T + f * DIM_T + t]! * COMPENSATE;
    }
    // Bins above dim_f stay zero — the model never predicts them, so all that treble belongs to the instrumental.
    leftOutFrames.push(interleave(lRe, lIm));
    rightOutFrames.push(interleave(rRe, rIm));
  }

  return {
    left: istft(leftOutFrames, N_FFT, HOP, window, CHUNK_SIZE),
    right: istft(rightOutFrames, N_FFT, HOP, window, CHUNK_SIZE),
  };
}

// Fades a segment in/out across the overlap so neighbouring chunks blend instead of butting together with a click.
function crossfadeWeight(
  j: number,
  segLen: number,
  fadeIn: boolean,
  fadeOut: boolean
): number {
  let w = 1;
  if (fadeIn && j < OVERLAP) w = Math.min(w, j / OVERLAP);
  if (fadeOut && j >= segLen - OVERLAP) {
    w = Math.min(w, (segLen - 1 - j) / OVERLAP);
  }
  return Math.max(w, 0);
}

async function separate(
  channelData: Float32Array[],
  denoise: boolean
): Promise<{ vocals: Float32Array[]; instrumental: Float32Array[] }> {
  const isStereo = channelData.length >= 2;
  const left = channelData[0]!;
  const right = isStereo ? channelData[1]! : channelData[0]!;
  const totalLength = left.length;

  const step = GEN_SIZE - OVERLAP;
  const numChunks = Math.max(
    1,
    Math.ceil(Math.max(0, totalLength - GEN_SIZE) / step) + 1
  );
  const paddedLength = TRIM + (numChunks - 1) * step + CHUNK_SIZE;
  const paddedLeft = padMixtureChannel(left, TRIM, paddedLength);
  const paddedRight = padMixtureChannel(right, TRIM, paddedLength);

  const session = await getSession();

  const accLeft = new Float32Array(totalLength);
  const accRight = new Float32Array(totalLength);
  const weights = new Float32Array(totalLength);

  for (let c = 0; c < numChunks; c++) {
    const start = c * step;
    const { left: outLeft, right: outRight } = await runChunk(
      session,
      paddedLeft.slice(start, start + CHUNK_SIZE),
      paddedRight.slice(start, start + CHUNK_SIZE),
      denoise
    );

    for (let j = 0; j < GEN_SIZE; j++) {
      const target = start + j;
      if (target >= totalLength) break;
      const w = crossfadeWeight(j, GEN_SIZE, c > 0, c < numChunks - 1);
      accLeft[target]! += outLeft[TRIM + j]! * w;
      accRight[target]! += outRight[TRIM + j]! * w;
      weights[target]! += w;
    }
    post({ type: 'processing-progress', chunk: c + 1, totalChunks: numChunks });
  }

  const vocalLeft = new Float32Array(totalLength);
  const vocalRight = new Float32Array(totalLength);
  for (let i = 0; i < totalLength; i++) {
    const w = weights[i]!;
    if (w > 1e-6) {
      vocalLeft[i] = accLeft[i]! / w;
      vocalRight[i] = accRight[i]! / w;
    }
  }

  const vocals = [vocalLeft, vocalRight];
  const instrumental = [
    Float32Array.from(left, (v, i) => v - vocalLeft[i]!),
    Float32Array.from(right, (v, i) => v - vocalRight[i]!),
  ];

  return { vocals, instrumental };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type !== 'separate') return;
  separate(request.channelData, request.denoise)
    .then(({ vocals, instrumental }) => {
      post(
        {
          type: 'result',
          vocals,
          instrumental,
          sampleRate: request.sampleRate,
        },
        [...vocals.map((c) => c.buffer), ...instrumental.map((c) => c.buffer)]
      );
    })
    .catch((err: unknown) => {
      post({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Vocal separation failed.',
      });
    });
};
