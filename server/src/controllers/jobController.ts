import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import mongoose, { type PipelineStage } from 'mongoose';
import { Job } from '../models/Job.js';
import { JobSyncRun } from '../models/JobSyncRun.js';
import { JobTracker } from '../models/JobTracker.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { bangladeshDay, isBangladeshDate } from '../utils/bdDate.js';
import {
  getJobSourceDiagnostics,
  syncConfiguredJobFeeds,
} from '../services/jobIngestService.js';
import type {
  IJob,
  IJobTrackerEntry,
  JobCategory,
  JobRegion,
  JobSyncResult,
  JobSyncTrigger,
} from '../types/index.js';

const CATEGORIES: JobCategory[] = [
  'government',
  'private',
  'it',
  'bank',
  'ngo',
  'other',
];

const REGIONS: JobRegion[] = ['bangladesh', 'remote', 'international'];

/** Cards only ever show a clamped preview, so the list never ships full descriptions. */
const EXCERPT_LENGTH = 280;
const ADMIN_PAGE_SIZE = 200;

const expired = (job: Pick<IJob, 'deadline'>): boolean =>
  Boolean(job.deadline && job.deadline < bangladeshDay());

const cleanQuery = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .slice(0, 100)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mongo expression for "this deadline has passed in Bangladesh". */
const expiredExpression = (today: string) => ({
  $and: [
    { $eq: [{ $type: '$deadline' }, 'string'] },
    { $ne: ['$deadline', ''] },
    { $lt: ['$deadline', today] },
  ],
});

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const today = bangladeshDay();
  const category = String(req.query.category ?? '');
  const categoryFilter = CATEGORIES.includes(category as JobCategory)
    ? { category }
    : null;

  const q = cleanQuery(req.query.q);
  const searchFilter = q
    ? {
        $or: [
          { title: new RegExp(q, 'i') },
          { company: new RegExp(q, 'i') },
          { location: new RegExp(q, 'i') },
          { employmentType: new RegExp(q, 'i') },
        ],
      }
    : null;

  // Expired postings are swept by the agent, so the board filters by region instead.
  const region = String(req.query.region ?? '');
  const regionFilter = REGIONS.includes(region as JobRegion)
    ? { region }
    : null;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 60));

  // `expired` is derived once so it can drive sorting, filtering and facets in one round trip.
  const pipeline: PipelineStage[] = [
    ...(searchFilter ? [{ $match: searchFilter }] : []),
    {
      $addFields: {
        expired: { $cond: [expiredExpression(today), true, false] },
        // Keeps this a Bangladesh-first board now that worldwide sources feed it.
        regionRank: {
          $switch: {
            branches: [
              { case: { $eq: ['$region', 'bangladesh'] }, then: 0 },
              { case: { $eq: ['$region', 'remote'] }, then: 1 },
            ],
            default: 2,
          },
        },
      },
    },
    ...(regionFilter ? [{ $match: regionFilter }] : []),
    {
      $facet: {
        data: [
          ...(categoryFilter ? [{ $match: categoryFilter }] : []),
          // Booleans sort false-first, so live postings always lead the board.
          {
            $sort: {
              expired: 1,
              regionRank: 1,
              publishedAt: -1,
              createdAt: -1,
            },
          },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              title: 1,
              company: 1,
              location: 1,
              category: 1,
              applyUrl: 1,
              sourceUrl: 1,
              sourceName: 1,
              source: 1,
              employmentType: 1,
              salary: 1,
              publishedAt: 1,
              deadline: 1,
              deadlineAssumed: 1,
              sources: 1,
              region: 1,
              attachments: 1,
              createdAt: 1,
              expired: 1,
              description: {
                $let: {
                  vars: { text: { $ifNull: ['$description', ''] } },
                  in: {
                    $cond: [
                      '$expired',
                      '',
                      {
                        $cond: [
                          {
                            $gt: [{ $strLenCP: '$$text' }, EXCERPT_LENGTH],
                          },
                          {
                            $concat: [
                              { $substrCP: ['$$text', 0, EXCERPT_LENGTH] },
                              '…',
                            ],
                          },
                          '$$text',
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
        total: [
          ...(categoryFilter ? [{ $match: categoryFilter }] : []),
          { $count: 'value' },
        ],
        // Counts ignore the active category so every chip can show its own total.
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        byRegion: [{ $group: { _id: '$region', count: { $sum: 1 } } }],
      },
    },
  ];

  const [result] = await Job.aggregate(pipeline);
  const data = (result?.data ?? []) as unknown[];
  const total = (result?.total?.[0]?.value ?? 0) as number;
  const byCategory = (result?.byCategory ?? []) as Array<{
    _id: JobCategory;
    count: number;
  }>;
  const byRegion = (result?.byRegion ?? []) as Array<{
    _id: JobRegion;
    count: number;
  }>;

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    facets: {
      all: byCategory.reduce((sum, entry) => sum + entry.count, 0),
      categories: Object.fromEntries(
        byCategory.map((entry) => [entry._id, entry.count])
      ),
      regions: Object.fromEntries(
        byRegion.map((entry) => [entry._id, entry.count])
      ),
    },
  });
});

export const getPublicJob = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    // Without this a malformed id raises a CastError and surfaces as a 500.
    if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Job not found');

    const job = await Job.findById(id).lean();
    if (!job) throw ApiError.notFound('Job not found');
    if (expired(job))
      throw new ApiError(
        410,
        'This job has expired. Its description is no longer available.'
      );

    const related = await Job.find({
      _id: { $ne: job._id },
      category: job.category,
      $or: [
        { deadline: { $gte: bangladeshDay() } },
        { deadline: { $exists: false } },
        { deadline: '' },
      ],
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(3)
      .select('title company location category deadline sourceName')
      .lean();

    res.json({
      success: true,
      data: { ...job, expired: false },
      related,
    });
  }
);

export const listAdminJobs = asyncHandler(
  async (req: Request, res: Response) => {
    const q = cleanQuery(req.query.q);
    const filter = q
      ? {
          $or: [{ title: new RegExp(q, 'i') }, { company: new RegExp(q, 'i') }],
        }
      : {};
    // Capped so a long-running sync can never turn the admin list into a huge payload.
    const [data, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).limit(ADMIN_PAGE_SIZE).lean(),
      Job.countDocuments(filter),
    ]);
    res.json({ success: true, count: data.length, total, data });
  }
);

const EDITABLE_FIELDS = [
  'title',
  'company',
  'location',
  'category',
  'description',
  'applyUrl',
  'sourceUrl',
  'sourceName',
  'sourceKey',
  'externalId',
  'source',
  'employmentType',
  'salary',
  'publishedAt',
  'deadline',
] as const;

/** Keeps `_id`, timestamps and ingestion bookkeeping out of admin-supplied bodies. */
const pickJobFields = (
  body: unknown
): { set: Record<string, unknown>; clearDeadline: boolean } => {
  const input = (body ?? {}) as Record<string, unknown>;
  const set: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (input[field] !== undefined) set[field] = input[field];
  }
  if (set.source !== 'automated') set.source = 'manual';

  // An omitted deadline leaves the stored one alone; an explicitly blank one clears it.
  let clearDeadline = false;
  if (set.deadline !== undefined) {
    const deadline = String(set.deadline).trim();
    if (!deadline) {
      clearDeadline = true;
      delete set.deadline;
    } else if (!isBangladeshDate(deadline)) {
      throw ApiError.badRequest('Deadline must be a YYYY-MM-DD date.', [
        { field: 'deadline', message: 'Use the YYYY-MM-DD format.' },
      ]);
    } else {
      set.deadline = deadline;
    }
  }
  return { set, clearDeadline };
};

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const { set } = pickJobFields(req.body);
  const job = await Job.create(set);
  res.status(201).json({ success: true, data: job });
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id))
    throw ApiError.notFound('Job not found');
  const { set, clearDeadline } = pickJobFields(req.body);
  const job = await Job.findByIdAndUpdate(
    req.params.id,
    { $set: set, ...(clearDeadline ? { $unset: { deadline: '' } } : {}) },
    { new: true, runValidators: true }
  );
  if (!job) throw ApiError.notFound('Job not found');
  res.json({ success: true, data: job });
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id))
    throw ApiError.notFound('Job not found');
  const job = await Job.findByIdAndDelete(req.params.id);
  if (!job) throw ApiError.notFound('Job not found');
  res.json({ success: true, message: 'Job deleted' });
});

/** Recorded on the app connection, not the agent's: the agent credential is scoped to the job collections on purpose. */
const recordRun = async (
  trigger: JobSyncTrigger,
  result: JobSyncResult
): Promise<void> => {
  await JobSyncRun.create({
    trigger,
    finishedAt: new Date(),
    durationMs: result.durationMs,
    feeds: result.feeds,
    scanned: result.scanned,
    unique: result.unique,
    duplicatesMerged: result.duplicatesMerged,
    added: result.added,
    updated: result.updated,
    expiredRemoved: result.expiredRemoved,
    purged: result.purged,
    failures: result.failures,
    warnings: result.warnings,
    scopedDb: result.scopedDb,
  }).catch((error: unknown) => {
    // A sync that worked must not be reported as failed just because its log entry could not be written.
    console.warn('⚠️  Sync run not recorded:', error);
  });
};

export const syncJobs = asyncHandler(async (_req: Request, res: Response) => {
  const result = await syncConfiguredJobFeeds();
  await recordRun('manual', result);
  res.json({ success: true, data: result });
});

/** Recent runs, newest first, so the panel can show what actually happened instead of a fixed description. */
export const jobSyncRuns = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await JobSyncRun.find()
      .sort({ finishedAt: -1 })
      .limit(10)
      .lean();
    res.json({ success: true, count: data.length, data });
  }
);

export const jobSourceHealth = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await getJobSourceDiagnostics();
    res.json({ success: true, count: data.length, data });
  }
);

const secretMatches = (provided: string, expected: string): boolean => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const cronSyncJobs = asyncHandler(
  async (req: Request, res: Response) => {
    const header = req.get('authorization') ?? '';
    if (!env.cronSecret || !secretMatches(header, `Bearer ${env.cronSecret}`)) {
      throw ApiError.forbidden('Invalid cron secret');
    }
    const result = await syncConfiguredJobFeeds();
    await recordRun('automatic', result);
    res.json({ success: true, data: result });
  }
);

/* -------------------------------------------------- anonymous job tracker */

/** The client generates this opaque id; bounding its shape stops it being abused as free-form storage. */
const DEVICE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

interface IncomingEntry {
  jobId?: unknown;
  applied?: unknown;
  appliedAt?: unknown;
  saved?: unknown;
  savedAt?: unknown;
  hidden?: unknown;
  hiddenAt?: unknown;
  note?: unknown;
  updatedAt?: unknown;
}

const asDateOrUndefined = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Returns a device's tracked jobs, pruning any whose posting no longer exists so state never outlives the job. */
export const getJobTracker = asyncHandler(
  async (req: Request, res: Response) => {
    const deviceId = String(req.params.deviceId ?? '');
    if (!DEVICE_ID_RE.test(deviceId))
      throw ApiError.badRequest('Invalid device id');

    const doc = await JobTracker.findOne({ deviceId }).lean();
    const entries = doc?.entries ?? [];
    if (!entries.length) return res.json({ success: true, data: [] });

    const ids = entries
      .map((entry) => entry.jobId)
      .filter((id) => mongoose.isValidObjectId(id));
    const live = new Set(
      (
        await Job.find({ _id: { $in: ids } })
          .select('_id')
          .lean()
      ).map((job) => String(job._id))
    );
    const kept = entries.filter((entry) => live.has(entry.jobId));
    if (kept.length !== entries.length)
      await JobTracker.updateOne({ deviceId }, { $set: { entries: kept } });

    res.json({ success: true, data: kept });
  }
);

/** Merges a device's incoming state, newest write per job winning so two synced devices can't clobber each other. */
export const putJobTracker = asyncHandler(
  async (req: Request, res: Response) => {
    const deviceId = String(req.params.deviceId ?? '');
    if (!DEVICE_ID_RE.test(deviceId))
      throw ApiError.badRequest('Invalid device id');

    const body = req.body as { entries?: unknown };
    const incoming = Array.isArray(body.entries) ? body.entries : [];
    const clean = incoming.slice(0, 1000).flatMap((raw): IJobTrackerEntry[] => {
      const entry = raw as IncomingEntry;
      if (
        typeof entry.jobId !== 'string' ||
        !mongoose.isValidObjectId(entry.jobId)
      )
        return [];
      return [
        {
          jobId: entry.jobId,
          applied: Boolean(entry.applied),
          appliedAt: asDateOrUndefined(entry.appliedAt),
          saved: Boolean(entry.saved),
          savedAt: asDateOrUndefined(entry.savedAt),
          hidden: Boolean(entry.hidden),
          hiddenAt: asDateOrUndefined(entry.hiddenAt),
          note:
            typeof entry.note === 'string'
              ? entry.note.slice(0, 2000)
              : undefined,
          updatedAt: asDateOrUndefined(entry.updatedAt) ?? new Date(),
        },
      ];
    });

    const existing =
      (await JobTracker.findOne({ deviceId }).lean())?.entries ?? [];
    const byId = new Map(existing.map((entry) => [entry.jobId, entry]));
    for (const entry of clean) {
      const prev = byId.get(entry.jobId);
      if (!prev || entry.updatedAt >= new Date(prev.updatedAt))
        byId.set(entry.jobId, entry);
    }
    // An entry with nothing set is just noise, so it is dropped rather than stored.
    const merged = [...byId.values()].filter(
      (entry) => entry.applied || entry.saved || entry.hidden || entry.note
    );
    await JobTracker.updateOne(
      { deviceId },
      { $set: { entries: merged } },
      { upsert: true }
    );
    res.json({ success: true, count: merged.length });
  }
);
