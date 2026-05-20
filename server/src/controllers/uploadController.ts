import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import cloudinary, {
  uploadBuffer,
  destroyAsset,
} from '../config/cloudinary.js';
import { env } from '../config/env.js';

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

/** Admin — upload the resume PDF as a raw asset. The public_id is built
 *  with a `.pdf` suffix so Cloudinary's CDN URL ends with `.pdf` and the
 *  browser serves it as `application/pdf` (download lands as a usable
 *  resume.pdf file; in-tab preview opens the PDF viewer). Without the
 *  suffix the raw asset URL is extension-less and downloads as a
 *  type-less blob that looks corrupted. */
export const uploadResumeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No PDF file provided.');
    const base = (req.file.originalname || 'resume')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .toLowerCase()
      .slice(0, 40);
    const publicId = `${base || 'resume'}-${Date.now()}.pdf`;
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'portfolio/resume',
      publicId,
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

interface CldResource {
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
}

/** Admin — browse the Cloudinary media library (by folder prefix, paginated). */
export const listAssetsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!env.cloudinary.configured) {
      throw ApiError.badRequest('Cloudinary is not configured.');
    }
    const folder =
      typeof req.query.folder === 'string' && req.query.folder
        ? req.query.folder
        : env.cloudinary.folder;
    const cursor =
      typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    const result = (await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 30,
      ...(cursor ? { next_cursor: cursor } : {}),
    })) as unknown as {
      resources?: CldResource[];
      next_cursor?: string;
    };

    const data = (result.resources ?? []).map((r) => ({
      publicId: r.public_id,
      url: r.secure_url,
      format: r.format,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
      createdAt: r.created_at,
    }));
    res.json({
      success: true,
      data,
      nextCursor: result.next_cursor ?? null,
    });
  }
);
