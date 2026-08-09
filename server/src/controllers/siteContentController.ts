import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SiteContent } from '../models/SiteContent.js';

/** Public — the single site-content doc (creates an empty one if absent). */
export const getSiteContent = asyncHandler(
  async (_req: Request, res: Response) => {
    // Atomic get-or-create avoids a find-then-create race that could insert duplicate "singleton" docs on concurrent first hits.
    const content = await SiteContent.findOneAndUpdate(
      {},
      {},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ success: true, data: content });
  }
);

/** Admin — upsert the single site-content doc. */
export const updateSiteContent = asyncHandler(
  async (req: Request, res: Response) => {
    const content = await SiteContent.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }).lean();
    res.json({ success: true, data: content });
  }
);
