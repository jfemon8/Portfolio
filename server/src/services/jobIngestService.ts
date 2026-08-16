import { env, type JobFeedConfig } from '../config/env.js';
import { bangladeshDay, bangladeshDayBefore } from '../utils/bdDate.js';
import { getAgentModels } from './jobs/agentDb.js';
import { crawlSource } from './jobs/crawlers.js';
import {
  parseGreenhouse,
  parseJson,
  parseLever,
  parseRemoteBoard,
  parseRss,
} from './jobs/feedParsers.js';
import { dedupeKeyOf, mergeDuplicates, type MergedJob } from './jobs/dedupe.js';
import { classify, isBangladeshLocation, regionOf } from './jobs/text.js';
import type { FetchText, SourceJob } from './jobs/types.js';
import type {
  IJobSourceHealth,
  JobFeedOutcome,
  JobSyncResult,
} from '../types/index.js';

const DEFAULT_TIMEOUT_MS = 30_000;
/** Full-content ATS boards run to several megabytes; the cap only stops runaways. */
const MAX_RESPONSE_BYTES = 16_000_000;
/** Sources run in waves so a dozen multi-megabyte boards can't peak memory at once. */
const SOURCE_CONCURRENCY = 6;
/** Stop starting sources here, leaving headroom under the 60s Vercel function limit to write results. */
const RUN_BUDGET_MS = 40_000;
/** Undated postings can't be windowed, so only the newest few per source are trusted. */
const MAX_UNDATED_PER_SOURCE = 25;
/** Failures in a row before a source is rested; it is retried after the backoff. */
const FAILURES_BEFORE_DISABLE = 3;
const DISABLE_HOURS = 12;
const DAY_MS = 86_400_000;

/** Mirrors the maxlength constraints on the Job schema so one oversized field can't fail a source. */
const LIMITS = {
  title: 240,
  company: 160,
  location: 160,
  description: 30_000,
  applyUrl: 2048,
  sourceUrl: 2048,
  employmentType: 80,
  salary: 120,
  externalId: 300,
  dedupeKey: 400,
} as const;

const clamp = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

const kindOf = (feed: JobFeedConfig): 'feed' | 'crawler' =>
  feed.format === 'crawl' ? 'crawler' : 'feed';

/** A bad pattern in config must disable that filter, never crash the run. */
const safePattern = (source?: string): RegExp | null => {
  if (!source) return null;
  try {
    return new RegExp(source, 'iu');
  } catch {
    console.warn(`⚠️  Ignoring invalid job source pattern: ${source}`);
    return null;
  }
};

/* ------------------------------------------------------------------ fetch */

/** Builds the single rate-limited, size-capped fetcher every adapter must go through. */
function makeFetcher(feed: JobFeedConfig): FetchText {
  const timeoutMs = feed.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs * 3;

  return async (url: string, accept?: string): Promise<string> => {
    if (Date.now() > deadline)
      throw new Error('Source exceeded its overall time budget');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          // Several public sources reject requests without a descriptive agent.
          'User-Agent':
            'PortfolioJobBot/1.0 (+https://github.com/; respects robots.txt)',
          'Accept-Language': 'en',
          Accept:
            accept ??
            (feed.format === 'rss'
              ? 'application/rss+xml, application/atom+xml, application/xml, text/xml'
              : 'application/json'),
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const declared = Number(response.headers.get('content-length') ?? 0);
      if (declared > MAX_RESPONSE_BYTES)
        throw new Error(`Response too large (${declared} bytes)`);
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BYTES)
        throw new Error('Response too large');
      return text;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error(`Timed out after ${timeoutMs / 1000}s`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}

/** Runs one source through its adapter and tags every posting with its provenance. */
async function loadSource(feed: JobFeedConfig): Promise<SourceJob[]> {
  const fetchText = makeFetcher(feed);
  const jobs =
    feed.format === 'crawl'
      ? await crawlSource(feed, fetchText)
      : await (async () => {
          const text = await fetchText(feed.url);
          if (feed.format === 'rss') return parseRss(text, feed);
          if (feed.format === 'lever') return parseLever(text, feed);
          if (feed.format === 'greenhouse') return parseGreenhouse(text, feed);
          if (feed.format === 'remote') return parseRemoteBoard(text, feed);
          return parseJson(text, feed);
        })();

  // Circular blogs mix vacancies with results and admit cards, so a source declares which posts are jobs.
  const include = safePattern(feed.include);
  const exclude = safePattern(feed.exclude);
  const relevant = jobs.filter(
    (job) =>
      (!include || include.test(job.title)) &&
      (!exclude || !exclude.test(job.title))
  );

  const scoped = feed.bangladeshOnly
    ? relevant.filter((job) => isBangladeshLocation(job.location))
    : relevant;

  // One source occasionally repeats a posting across pages; the last write would win anyway.
  const unique = [
    ...new Map(scoped.map((job) => [job.externalId, job])).values(),
  ];
  return unique.map((job) => ({
    ...job,
    sourceKey: feed.key,
    sourceName: feed.name,
  }));
}

/* ----------------------------------------------------------- eligibility */

interface JobSyncOptions {
  /** One-time migration only; scheduled and normal admin syncs stay inside the window. */
  includeHistorical?: boolean;
  lookbackDays?: number;
}

/** A stated deadline decides whether a vacancy is open; only undeadlined ones fall back to the date window. */
function selectEligible(
  jobs: SourceJob[],
  options: JobSyncOptions
): { eligible: SourceJob[]; skipped: number } {
  if (options.includeHistorical) return { eligible: jobs, skipped: 0 };

  const earliestDay = bangladeshDayBefore(
    Math.max(0, options.lookbackDays ?? env.jobSync.lookbackDays)
  );
  const today = bangladeshDay();
  const undatedTaken = new Map<string, number>();

  const eligible = jobs.filter((job) => {
    if (job.deadline) return job.deadline >= today;
    if (!job.publishedAt) {
      const key = job.sourceKey ?? '';
      const taken = (undatedTaken.get(key) ?? 0) + 1;
      undatedTaken.set(key, taken);
      return taken <= MAX_UNDATED_PER_SOURCE;
    }
    return bangladeshDay(job.publishedAt) >= earliestDay;
  });

  return { eligible, skipped: jobs.length - eligible.length };
}

/** The one-month default validity, anchored to the posting date when there is one. */
const assumedDeadline = (publishedAt?: Date): string => {
  const anchor = publishedAt ?? new Date();
  const base = Math.max(anchor.getTime(), Date.now() - 7 * DAY_MS);
  return bangladeshDay(new Date(base + env.jobSync.validityDays * DAY_MS));
};

/* ------------------------------------------------------------------ sync */

export async function syncConfiguredJobFeeds(
  options: JobSyncOptions = {}
): Promise<JobSyncResult> {
  const startedAt = Date.now();
  const { Job, JobSourceHealth, scoped } = await getAgentModels();
  const warnings: string[] = [];
  if (!scoped && env.jobSync.agentUri === undefined) {
    warnings.push(
      'Agent is using the application database credential — set JOBS_AGENT_MONGODB_URI to restrict it to the job collections.'
    );
  } else {
    // A configured-but-unusable credential must be loud, not a silent fallback.
    warnings.push(
      'JOBS_AGENT_MONGODB_URI is set but could not be used — the agent fell back to the application credential. Check the user, password and role in Atlas.'
    );
  }

  const health = new Map<string, IJobSourceHealth>(
    (await JobSourceHealth.find().lean()).map((record) => [record.key, record])
  );
  const now = new Date();

  const runSource = async (
    feed: JobFeedConfig
  ): Promise<[JobFeedOutcome, SourceJob[]]> => {
    {
      const base: JobFeedOutcome = {
        key: feed.key,
        name: feed.name,
        kind: kindOf(feed),
        ok: false,
        scanned: 0,
        durationMs: 0,
      };
      const record = health.get(feed.key);
      if (record?.disabledUntil && record.disabledUntil > now) {
        return [
          {
            ...base,
            ok: true,
            skippedDisabled: true,
            error: `Rested until ${record.disabledUntil.toISOString().slice(0, 16)} after ${record.consecutiveFailures} failures`,
          },
          [],
        ];
      }
      // Leaves room to persist before the serverless function is killed; a source
      // skipped here simply runs first on the next pass.
      if (Date.now() - startedAt > RUN_BUDGET_MS) {
        return [
          {
            ...base,
            ok: true,
            skippedDisabled: true,
            error: 'Skipped — run budget reached, will be picked up next run',
          },
          [],
        ];
      }

      const sourceStart = Date.now();
      try {
        const jobs = await loadSource(feed);
        return [
          {
            ...base,
            ok: true,
            scanned: jobs.length,
            durationMs: Date.now() - sourceStart,
          },
          jobs,
        ];
      } catch (error) {
        return [
          {
            ...base,
            durationMs: Date.now() - sourceStart,
            error: errorText(error),
          },
          [],
        ];
      }
    }
  };

  // Least-recently-run first, so a source dropped by the budget leads the next pass.
  const queue = [...env.jobFeeds].sort(
    (a, b) =>
      (health.get(a.key)?.lastRunAt?.getTime() ?? 0) -
      (health.get(b.key)?.lastRunAt?.getTime() ?? 0)
  );

  const outcomes: Array<[JobFeedOutcome, SourceJob[]]> = [];
  for (let index = 0; index < queue.length; index += SOURCE_CONCURRENCY) {
    const wave = queue.slice(index, index + SOURCE_CONCURRENCY);
    outcomes.push(...(await Promise.all(wave.map(runSource))));
  }

  const perFeed = outcomes.map(([outcome]) => outcome);
  const collected = outcomes.flatMap(([, jobs]) => jobs);

  // Dedupe across all sources at once — the only place one vacancy from two boards is recognisable as one.
  const merged = mergeDuplicates(collected);
  const { eligible, skipped } = selectEligible(merged, options) as {
    eligible: MergedJob[];
    skipped: number;
  };

  const writes = await persist(Job, eligible, now);
  const expiredRemoved = perFeed.some(
    (outcome) => outcome.ok && !outcome.skippedDisabled
  )
    ? await removeExpired(Job)
    : 0;
  const purged = perFeed.some((outcome) => outcome.ok && outcome.scanned > 0)
    ? await purgeStale(Job)
    : 0;

  await recordHealth(JobSourceHealth, perFeed, health, now);

  const failures = perFeed
    .filter((outcome) => outcome.error && !outcome.skippedDisabled)
    .map((outcome) => `${outcome.name}: ${outcome.error ?? 'failed'}`);
  if (failures.length)
    console.warn(`⚠️  Job sync issues: ${failures.join(' | ')}`);
  for (const outcome of perFeed) {
    if (outcome.skippedDisabled)
      warnings.push(`${outcome.name}: ${outcome.error ?? 'skipped'}`);
    else if (outcome.ok && outcome.scanned === 0)
      warnings.push(`${outcome.name} returned no postings.`);
  }

  return {
    scopedDb: scoped,
    feeds: env.jobFeeds.length,
    scanned: collected.length,
    unique: merged.length,
    duplicatesMerged: collected.length - merged.length,
    added: writes.added,
    updated: writes.updated,
    skipped,
    expiredRemoved,
    purged,
    durationMs: Date.now() - startedAt,
    failures,
    warnings,
    perFeed,
  };
}

/* --------------------------------------------------------------- persist */

type JobModel = Awaited<ReturnType<typeof getAgentModels>>['Job'];
type HealthModel = Awaited<
  ReturnType<typeof getAgentModels>
>['JobSourceHealth'];

async function persist(
  Job: JobModel,
  jobs: MergedJob[],
  now: Date
): Promise<{ added: number; updated: number }> {
  await backfillDedupeKeys(Job);
  if (!jobs.length) return { added: 0, updated: 0 };

  const operations = jobs.map((item) => {
    const set: Record<string, unknown> = {
      title: clamp(item.title, LIMITS.title),
      company: clamp(item.company || item.sourceName || '', LIMITS.company),
      location: clamp(item.location || 'Bangladesh', LIMITS.location),
      description: clamp(item.description, LIMITS.description),
      applyUrl: clamp(item.applyUrl, LIMITS.applyUrl),
      sourceUrl: clamp(item.sourceUrl, LIMITS.sourceUrl),
      employmentType: clamp(item.employmentType, LIMITS.employmentType),
      salary: clamp(item.salary, LIMITS.salary),
      externalId: clamp(item.externalId, LIMITS.externalId),
      region: regionOf(item.location),
      attachments: (item.attachments ?? []).slice(0, 6),
      category: classify(
        `${item.title} ${item.classifierHint ?? ''} ${item.description}`,
        categoryOf(item)
      ),
      source: 'automated',
      sourceKey: item.sourceKey,
      sourceName: item.sourceName,
      sources: item.sources.slice(0, 8),
      quality: item.quality,
      lastSeenAt: now,
    };
    if (item.publishedAt) set.publishedAt = item.publishedAt;
    // A stated deadline always overwrites the assumed one; the reverse never happens.
    if (item.deadline) {
      set.deadline = item.deadline;
      set.deadlineAssumed = false;
    }

    const onInsert: Record<string, unknown> = {};
    if (!item.publishedAt) onInsert.publishedAt = now;
    if (!item.deadline) {
      onInsert.deadline = assumedDeadline(item.publishedAt);
      onInsert.deadlineAssumed = true;
    }

    return {
      updateOne: {
        filter: {
          source: 'automated' as const,
          dedupeKey: clamp(item.dedupeKey, LIMITS.dedupeKey),
        },
        update: {
          $set: set,
          ...(Object.keys(onInsert).length ? { $setOnInsert: onInsert } : {}),
        },
        upsert: true,
      },
    };
  });

  try {
    const result = await Job.bulkWrite(operations, { ordered: false });
    return {
      added: result.upsertedCount ?? 0,
      updated: result.modifiedCount ?? 0,
    };
  } catch (error) {
    // A partial bulk failure still reports what landed, so one bad row isn't a lost run.
    const partial = (
      error as { result?: { upsertedCount?: number; modifiedCount?: number } }
    ).result;
    console.warn(`⚠️  Job bulk write partially failed: ${errorText(error)}`);
    return {
      added: partial?.upsertedCount ?? 0,
      updated: partial?.modifiedCount ?? 0,
    };
  }
}

const categoryOf = (item: MergedJob): JobFeedConfig['category'] =>
  env.jobFeeds.find((feed) => feed.key === item.sourceKey)?.category;

/** Older rows predate the fingerprint; without this they would duplicate on first run. */
async function backfillDedupeKeys(Job: JobModel): Promise<void> {
  const stale = await Job.find({
    $or: [
      { dedupeKey: { $exists: false } },
      { dedupeKey: '' },
      { region: { $exists: false } },
    ],
  })
    .select('title company location source')
    .limit(2000)
    .lean();
  if (!stale.length) return;

  await Job.bulkWrite(
    stale.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            // Rows predating these fields stay invisible to the fingerprint upsert until stamped.
            region: regionOf(doc.location ?? ''),
            ...(doc.source === 'automated'
              ? {
                  dedupeKey: clamp(
                    dedupeKeyOf({ title: doc.title, company: doc.company }),
                    LIMITS.dedupeKey
                  ),
                }
              : {}),
          },
        },
      },
    })),
    { ordered: false }
  ).catch((error: unknown) => {
    // Duplicate keys here mean the old data already held duplicates; the sweep below clears them.
    console.warn(`⚠️  Dedupe backfill partial: ${errorText(error)}`);
  });

  await removeBackfillDuplicates(Job);
}

/** Collapses pre-existing duplicate rows that the new fingerprint has just revealed. */
async function removeBackfillDuplicates(Job: JobModel): Promise<void> {
  const groups = await Job.aggregate<{ _id: string; ids: unknown[] }>([
    { $match: { source: 'automated', dedupeKey: { $type: 'string' } } },
    { $sort: { quality: -1, updatedAt: -1 } },
    { $group: { _id: '$dedupeKey', ids: { $push: '$_id' } } },
    { $match: { 'ids.1': { $exists: true } } },
    { $limit: 500 },
  ]);
  const losers = groups.flatMap((group) => group.ids.slice(1));
  if (losers.length) {
    await Job.deleteMany({ _id: { $in: losers } });
    console.warn(
      `ℹ️  Merged ${losers.length} pre-existing duplicate job rows.`
    );
  }
}

/** The deadline is the contract: once it passes, the posting leaves the board. */
async function removeExpired(Job: JobModel): Promise<number> {
  const result = await Job.deleteMany({
    deadline: { $type: 'string', $ne: '', $lt: bangladeshDay() },
  });
  return result.deletedCount ?? 0;
}

/** Safety net for automated rows a source stopped listing without any deadline passing. */
async function purgeStale(Job: JobModel): Promise<number> {
  const days = env.jobSync.retentionDays;
  if (days <= 0) return 0;
  const result = await Job.deleteMany({
    source: 'automated',
    lastSeenAt: { $lt: new Date(Date.now() - days * DAY_MS) },
  });
  return result.deletedCount ?? 0;
}

/* ---------------------------------------------------------------- health */

/** Records each source's run so a silently broken source becomes visible and rests. */
async function recordHealth(
  JobSourceHealth: HealthModel,
  perFeed: JobFeedOutcome[],
  previous: Map<string, IJobSourceHealth>,
  now: Date
): Promise<void> {
  const live = perFeed.filter((outcome) => !outcome.skippedDisabled);
  if (!live.length) return;

  await JobSourceHealth.bulkWrite(
    live.map((outcome) => {
      const record = previous.get(outcome.key);
      const failed = Boolean(outcome.error);
      const consecutiveFailures = failed
        ? (record?.consecutiveFailures ?? 0) + 1
        : 0;
      const consecutiveEmpty =
        !failed && outcome.scanned === 0
          ? (record?.consecutiveEmpty ?? 0) + 1
          : 0;

      const set: Record<string, unknown> = {
        name: outcome.name,
        kind: outcome.kind,
        lastRunAt: now,
        lastError: outcome.error ?? '',
        consecutiveFailures,
        consecutiveEmpty,
        lastScanned: outcome.scanned,
        lastDurationMs: outcome.durationMs,
      };
      if (!failed) set.lastOkAt = now;
      // Repeated hard failures rest a source instead of retrying it every night.
      set.disabledUntil =
        consecutiveFailures >= FAILURES_BEFORE_DISABLE
          ? new Date(now.getTime() + DISABLE_HOURS * 3_600_000)
          : null;

      return {
        updateOne: {
          filter: { key: outcome.key },
          update: {
            $set: set,
            $inc: { totalRuns: 1, totalFailures: failed ? 1 : 0 },
          },
          upsert: true,
        },
      };
    }),
    { ordered: false }
  ).catch((error: unknown) => {
    console.warn(`⚠️  Job source health not recorded: ${errorText(error)}`);
  });
}

/** Diagnosis view for the admin screen: configured sources joined with their health. */
export async function getJobSourceDiagnostics(): Promise<
  Array<
    IJobSourceHealth & {
      configured: boolean;
      kind: 'feed' | 'crawler';
      status: 'healthy' | 'empty' | 'failing' | 'resting' | 'unknown';
    }
  >
> {
  const { JobSourceHealth } = await getAgentModels();
  const records = new Map(
    (await JobSourceHealth.find().lean()).map((record) => [record.key, record])
  );
  const now = Date.now();

  return env.jobFeeds.map((feed) => {
    const record = records.get(feed.key);
    const disabled =
      record?.disabledUntil && record.disabledUntil.getTime() > now;
    const status = !record
      ? ('unknown' as const)
      : disabled
        ? ('resting' as const)
        : record.consecutiveFailures > 0
          ? ('failing' as const)
          : record.consecutiveEmpty >= 2
            ? ('empty' as const)
            : ('healthy' as const);

    return {
      key: feed.key,
      name: feed.name,
      kind: kindOf(feed),
      configured: true,
      status,
      lastRunAt: record?.lastRunAt,
      lastOkAt: record?.lastOkAt,
      lastError: record?.lastError ?? '',
      consecutiveFailures: record?.consecutiveFailures ?? 0,
      consecutiveEmpty: record?.consecutiveEmpty ?? 0,
      lastScanned: record?.lastScanned ?? 0,
      lastAdded: record?.lastAdded ?? 0,
      totalRuns: record?.totalRuns ?? 0,
      totalFailures: record?.totalFailures ?? 0,
      lastDurationMs: record?.lastDurationMs ?? 0,
      disabledUntil: record?.disabledUntil,
    };
  });
}
