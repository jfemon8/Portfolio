import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Profile } from '../models/Profile.js';
import { CpStats } from '../models/CpStats.js';
import {
  fetchCodeforces,
  fetchLeetCode,
  fetchCodeChef,
} from '../services/cpService.js';

/** Serve the cache for this long before hitting Codeforces again. */
const TTL_MS = 6 * 60 * 60 * 1000; // 6h — respects CF rate limits, serverless-safe

/**
 * Public competitive-programming stats. The handle is admin-managed on the
 * Profile (fully-dynamic — no redeploy to change). Returns the cached
 * snapshot, refetching only when stale; on a Codeforces outage it falls
 * back to the last good cache so the section never breaks.
 */
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
      { ...snap, leetcode, codechef, fetchedAt: new Date() },
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
