import type { JobFeedConfig } from '../../config/env.js';
import type { JobAttachment } from '../../types/index.js';

/** One posting as produced by any adapter, before dedupe/merge and persistence. */
export interface SourceJob {
  title: string;
  externalId: string;
  sourceUrl: string;
  applyUrl: string;
  description: string;
  publishedAt?: Date;
  deadline?: string;
  company: string;
  location: string;
  employmentType: string;
  salary: string;
  /** Extra source-provided text (sector, department) fed to the category classifier. */
  classifierHint?: string;
  /** Scanned circulars / PDF notices carried by the posting. */
  attachments?: JobAttachment[];
  /** Set by the orchestrator once the owning source is known. */
  sourceKey?: string;
  sourceName?: string;
}

/** Every source — feed or crawler — reduces to this one call. */
export type SourceAdapter = (
  config: JobFeedConfig,
  fetchText: FetchText
) => Promise<SourceJob[]>;

/** Rate-limited, size-capped fetch handed to adapters so no adapter fetches directly. */
export type FetchText = (url: string, accept?: string) => Promise<string>;

export const MAX_ITEMS_PER_SOURCE = 250;
