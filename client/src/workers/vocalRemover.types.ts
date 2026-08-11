export interface SeparateRequest {
  type: 'separate';
  channelData: Float32Array[];
  sampleRate: number;
}

export interface ModelProgressMessage {
  type: 'model-progress';
  loaded: number;
  total: number;
}

export interface ProcessingProgressMessage {
  type: 'processing-progress';
  chunk: number;
  totalChunks: number;
}

export interface ResultMessage {
  type: 'result';
  vocals: Float32Array[];
  instrumental: Float32Array[];
  sampleRate: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WorkerRequest = SeparateRequest;

export type WorkerMessage =
  | ModelProgressMessage
  | ProcessingProgressMessage
  | ResultMessage
  | ErrorMessage;
