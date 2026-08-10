import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Profile } from '../models/Profile.js';
import { CpStats } from '../models/CpStats.js';
import {
  fetchCodeforces,
  fetchLeetCode,
  fetchCodeChef,
  fetchContestStandings,
  fetchRatingsBulk,
  type CpSnapshot,
} from '../services/cpService.js';
import {
  predictDeltas,
  sampleStandings,
  type Contestant,
} from '../services/ratingPredictor.js';

const TTL_MS = 6 * 60 * 60 * 1000; // 6h — respects CF rate limits, serverless-safe

// Public CP stats — handle is admin-managed (no redeploy to change); serves the cached snapshot, refetching only when stale, and falls back to the last good cache on a Codeforces outage.
export const getCpStats = asyncHandler(async (_req: Request, res: Response) => {
  const profile = await Profile.findOne()
    .select('codeforcesHandle leetcodeHandle codechefHandle')
    .lean<{
      codeforcesHandle?: string;
      leetcodeHandle?: string;
      codechefHandle?: string;
    } | null>();
  const handle = profile?.codeforcesHandle?.trim();
  const lcHandle = profile?.leetcodeHandle?.trim();
  const ccHandle = profile?.codechefHandle?.trim();
  if (!handle) throw ApiError.notFound('No Codeforces handle configured');

  const cached = await CpStats.findOne({ handle });
  const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS;
  if (isFresh) {
    res.json({ success: true, data: cached });
    return;
  }

  try {
    const [snap, leetcode, codechef] = await Promise.all([
      fetchCodeforces(handle),
      lcHandle ? fetchLeetCode(lcHandle) : Promise.resolve(null),
      ccHandle ? fetchCodeChef(ccHandle) : Promise.resolve(null),
    ]);
    const doc = await CpStats.findOneAndUpdate(
      { handle },
      // Pin the stored handle to the admin-configured value — Codeforces returns a canonically-cased handle (e.g. 'tourist' for 'Tourist'), and persisting that would make the case-sensitive findOne({ handle }) miss forever and collide on the unique index.
      { ...snap, handle, leetcode, codechef, fetchedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    if (cached) {
      res.json({ success: true, data: cached, stale: true });
      return;
    }
    throw new ApiError(
      502,
      err instanceof Error ? err.message : 'Could not reach Codeforces'
    );
  }
});

type CompareResult = CpSnapshot | { handle: string; error: string };

const resolveCompare = (
  outcome: PromiseSettledResult<CpSnapshot>,
  handle: string
): CompareResult =>
  outcome.status === 'fulfilled'
    ? outcome.value
    : {
        handle,
        error:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : 'Could not fetch this handle',
      };

// Public — live side-by-side Codeforces comparison for two arbitrary visitor-entered handles (not the owner's own stats, so no DB caching; rides cpToolLimiter instead).
export const compareCp = asyncHandler(async (req: Request, res: Response) => {
  const a = String(req.query.a || '').trim();
  const b = String(req.query.b || '').trim();
  if (!a || !b) throw ApiError.badRequest('Both handles (a, b) are required');

  const [snapA, snapB] = await Promise.allSettled([
    fetchCodeforces(a),
    fetchCodeforces(b),
  ]);

  res.json({
    success: true,
    data: { a: resolveCompare(snapA, a), b: resolveCompare(snapB, b) },
  });
});

// Public tool — unofficial predicted rating delta for one handle in a contest, computed from live standings (see services/ratingPredictor.ts for the algorithm and its caveats). Not cacheable — standings shift every request during a running contest; rides cpToolLimiter.
export const predictRating = asyncHandler(
  async (req: Request, res: Response) => {
    const contestId = Number(req.query.contestId);
    const handle = String(req.query.handle || '').trim();
    if (!Number.isFinite(contestId) || contestId <= 0) {
      throw ApiError.badRequest('A valid contestId is required');
    }
    if (!handle) throw ApiError.badRequest('A handle is required');

    const standings = await fetchContestStandings(contestId);
    const entry = standings.find(
      (s) => s.handle.toLowerCase() === handle.toLowerCase()
    );
    if (!entry) {
      throw ApiError.notFound(
        `"${handle}" isn't in this contest's rated standings — check the handle and contest id, or they may not have competed as a rated contestant.`
      );
    }

    // Codeforces won't paginate anonymous standings requests, so a big round's full field arrives in one shot — sampleStandings bounds it for the O(n^2) prediction math while keeping the sample representative (see ratingPredictor.ts).
    const sample = sampleStandings(standings, entry.handle);
    const ratings = await fetchRatingsBulk(sample.map((s) => s.handle));
    const contestants: Contestant[] = sample
      .filter((s) => ratings.has(s.handle))
      .map((s) => ({
        handle: s.handle,
        rank: s.rank,
        rating: ratings.get(s.handle)!,
      }));

    if (!ratings.has(entry.handle)) {
      throw ApiError.badRequest(
        `"${handle}" has no rating yet — the predictor only works for already-rated handles.`
      );
    }

    const deltas = predictDeltas(contestants);
    const currentRating = ratings.get(entry.handle)!;
    const predictedDelta = deltas.get(entry.handle) ?? 0;

    res.json({
      success: true,
      data: {
        handle: entry.handle,
        rank: entry.rank,
        currentRating,
        predictedDelta,
        predictedNewRating: currentRating + predictedDelta,
        contestantsConsidered: contestants.length,
      },
    });
  }
);
