export interface RegexMatch {
  text: string;
  index: number;
  groupCount: number;
  /** Per-group [start, end) offsets from the 'd' flag; null where a group did not participate. */
  indices: ([number, number] | null)[];
}

export interface RegexRequest {
  type: 'match';
  pattern: string;
  flags: string;
  text: string;
  limit: number;
}

export interface RegexResultMessage {
  type: 'result';
  matches: RegexMatch[];
  truncated: boolean;
}

export interface RegexErrorMessage {
  type: 'error';
  message: string;
}

export type RegexWorkerMessage = RegexResultMessage | RegexErrorMessage;
