import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SeoSettings } from '../models/SeoSettings.js';

/** Public — the single SEO-settings doc (creates an empty one if absent). */
export const getSeo = asyncHandler(async (_req: Request, res: Response) => {
  // Atomic get-or-create — avoids the find-then-create race that could
  // otherwise insert duplicate "singleton" docs on concurrent first hits.
  const seo = await SeoSettings.findOneAndUpdate(
    {},
    {},
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, data: seo });
});

/** Admin — upsert the single SEO-settings doc. */
export const updateSeo = asyncHandler(async (req: Request, res: Response) => {
  const seo = await SeoSettings.findOneAndUpdate({}, req.body, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  res.json({ success: true, data: seo });
});
