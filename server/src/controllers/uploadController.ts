import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadBuffer, destroyAsset } from '../config/cloudinary.js';

/** Admin — upload an image, returns { url, publicId }. */
export const uploadImageHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No image file provided.');
    const folder =
      typeof req.query.folder === 'string' ? req.query.folder : undefined;
    const result = await uploadBuffer(req.file.buffer, { folder });
    res.status(201).json({ success: true, ...result });
  }
);

/** Admin — upload the resume PDF as a raw asset. */
export const uploadResumeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No PDF file provided.');
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'portfolio/resume',
      resourceType: 'raw',
    });
    res.status(201).json({ success: true, ...result });
  }
);

/** Admin — delete an asset by publicId. */
export const deleteAssetHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { publicId } = req.body as { publicId?: string };
    if (!publicId) throw ApiError.badRequest('publicId is required.');
    await destroyAsset(publicId);
    res.json({ success: true, message: 'Asset deleted' });
  }
);
