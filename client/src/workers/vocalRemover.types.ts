export interface SeparateRequest {
  type: 'separate';
  channelData: Float32Array[];
  sampleRate: number;
  denoise: boolean;
}

export interface ModelProgressMessage {
  type: 'model-progress';
  loaded: number;
  total: number;
}

export interface ModelRetryMessage {
  type: 'model-retry';
  attempt: number;
  attempts: number;
}

export interface ProcessingProgressMessage {
  type: 'processing-progress';
  chunk: number;
  totalChunks: number;
}

export interface ResultMessage {
  type: 'result';
  vocalsWav: ArrayBuffer;
  instrumentalWav: ArrayBuffer;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WorkerRequest = SeparateRequest;

export type WorkerMessage =
  | ModelProgressMessage
  | ModelRetryMessage
  | ProcessingProgressMessage
  | ResultMessage
  | ErrorMessage;
