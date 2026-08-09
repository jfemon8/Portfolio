import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SiteSettings } from '../models/SiteSettings.js';

/** Public — the single site-layout doc (creates an empty one if absent). */
export const getSite = asyncHandler(async (_req: Request, res: Response) => {
  // Atomic get-or-create avoids a find-then-create race that could insert duplicate "singleton" docs on concurrent first hits.
  const site = await SiteSettings.findOneAndUpdate(
    {},
    {},
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  res.json({ success: true, data: site });
});

/** Admin — upsert the single site-layout doc. */
export const updateSite = asyncHandler(async (req: Request, res: Response) => {
  const site = await SiteSettings.findOneAndUpdate({}, req.body, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  }).lean();
  res.json({ success: true, data: site });
});
