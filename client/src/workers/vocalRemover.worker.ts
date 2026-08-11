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

function computePad(totalLength: number): {
  pad: number;
  paddedLength: number;
  numChunks: number;
} {
  const remainder = totalLength % GEN_SIZE;
  const pad = GEN_SIZE + TRIM - remainder;
  const paddedLength = TRIM + totalLength + pad;
  const numChunks = Math.floor((paddedLength - CHUNK_SIZE) / GEN_SIZE) + 1;
  return { pad, paddedLength, numChunks };
}

function padMixtureChannel(
  samples: Float32Array,
  trim: number,
  pad: number
): Float32Array {
  const out = new Float32Array(trim + samples.length + pad);
  out.set(samples, trim);
  return out;
}

async function runChunk(
  session: ort.InferenceSession,
  leftChunk: Float32Array,
  rightChunk: Float32Array
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

  const inputTensor = new ort.Tensor('float32', inputData, [
    1,
    4,
    DIM_F,
    DIM_T,
  ]);
  const outputs = await session.run({ input: inputTensor });
  const outputData = outputs.output!.data as Float32Array;

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
    // Bins above dim_f are outside the model's band — carried over from the original mix rather than left silent.
    for (let f = DIM_F; f < N_BINS; f++) {
      lRe[f] = leftFrames[t]!.re[f]!;
      lIm[f] = leftFrames[t]!.im[f]!;
      rRe[f] = rightFrames[t]!.re[f]!;
      rIm[f] = rightFrames[t]!.im[f]!;
    }
    leftOutFrames.push(interleave(lRe, lIm));
    rightOutFrames.push(interleave(rRe, rIm));
  }

  return {
    left: istft(leftOutFrames, N_FFT, HOP, window, CHUNK_SIZE),
    right: istft(rightOutFrames, N_FFT, HOP, window, CHUNK_SIZE),
  };
}

async function separate(channelData: Float32Array[]): Promise<{
  vocals: Float32Array[];
  instrumental: Float32Array[];
}> {
  const isStereo = channelData.length >= 2;
  const left = channelData[0]!;
  const right = isStereo ? channelData[1]! : channelData[0]!;
  const totalLength = left.length;

  const { pad, numChunks } = computePad(totalLength);
  const paddedLeft = padMixtureChannel(left, TRIM, pad);
  const paddedRight = padMixtureChannel(right, TRIM, pad);

  const session = await getSession();

  const vocalLeft = new Float32Array(numChunks * GEN_SIZE);
  const vocalRight = new Float32Array(numChunks * GEN_SIZE);

  for (let c = 0; c < numChunks; c++) {
    const start = c * GEN_SIZE;
    const leftChunk = paddedLeft.slice(start, start + CHUNK_SIZE);
    const rightChunk = paddedRight.slice(start, start + CHUNK_SIZE);
    const { left: outLeft, right: outRight } = await runChunk(
      session,
      leftChunk,
      rightChunk
    );
    vocalLeft.set(outLeft.slice(TRIM, TRIM + GEN_SIZE), c * GEN_SIZE);
    vocalRight.set(outRight.slice(TRIM, TRIM + GEN_SIZE), c * GEN_SIZE);
    post({ type: 'processing-progress', chunk: c + 1, totalChunks: numChunks });
  }

  const vocals = [
    vocalLeft.slice(0, totalLength),
    vocalRight.slice(0, totalLength),
  ];
  const instrumental = [
    Float32Array.from(left, (v, i) => v - vocals[0]![i]!),
    Float32Array.from(right, (v, i) => v - vocals[1]![i]!),
  ];

  return { vocals, instrumental };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type !== 'separate') return;
  separate(request.channelData)
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
