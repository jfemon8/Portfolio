import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import mongoose, { type PipelineStage } from 'mongoose';
import { Job } from '../models/Job.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { bangladeshDay, isBangladeshDate } from '../utils/bdDate.js';
import {
  getJobSourceDiagnostics,
  syncConfiguredJobFeeds,
} from '../services/jobIngestService.js';
import type { IJob, JobCategory, JobRegion } from '../types/index.js';

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

export const syncJobs = asyncHandler(async (_req: Request, res: Response) => {
  const result = await syncConfiguredJobFeeds();
  res.json({ success: true, data: result });
});

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
    res.json({ success: true, data: result });
  }
);
