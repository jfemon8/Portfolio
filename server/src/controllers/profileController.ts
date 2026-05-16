import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Profile } from '../models/Profile.js';

/** Public — returns the single profile document (creates an empty one if absent). */
export const getProfile = asyncHandler(
  async (_req: Request, res: Response) => {
    let profile = await Profile.findOne();
    if (!profile) {
      profile = await Profile.create({
        name: 'Your Name',
        title: 'Your Title',
      });
    }
    res.json({ success: true, data: profile });
  }
);

/** Admin — upsert the single profile document. */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const profile = await Profile.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
    res.json({ success: true, data: profile });
  }
);
