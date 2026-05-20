import type { Request, Response, NextFunction } from 'express';
import https from 'node:https';
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /upload/proxy — Stream a Cloudinary file back to the browser with the
// CORRECT Content-Type + a sensible Content-Disposition. Cloudinary's `raw`
// storage class (used for PDFs / docs / archives) serves every asset with
// `Content-Type: application/octet-stream`, which makes browsers download it
// as an opaque blob with no extension — exactly the "corrupted file" symptom
// the resume upload exhibited. This proxy fixes that for any file kind in
// one place. Query: ?url=<cloudinaryUrl>&name=<filename>&inline=true|false
// SSRF-guarded: only our own Cloudinary cloud host is reachable.
// (Adopted from the RDSWA project's `/api/upload/proxy` — same strategy.)
// ─────────────────────────────────────────────────────────────────────────────
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

export const proxyFileHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const rawUrl = String(req.query.url || '');
    const inline = req.query.inline !== 'false'; // default = inline preview
    const downloadName = String(req.query.name || '')
      .replace(/[\r\n"]/g, '')
      .trim();

    if (!rawUrl) {
      return next(ApiError.badRequest('url query parameter is required'));
    }

    // SSRF guard — only allow our own Cloudinary cloud as upstream.
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return next(ApiError.badRequest('Invalid url'));
    }
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'res.cloudinary.com'
    ) {
      return next(ApiError.badRequest('Only Cloudinary URLs are allowed'));
    }
    const cloudName = env.cloudinary.cloudName || '';
    if (cloudName && !parsed.pathname.startsWith(`/${cloudName}/`)) {
      return next(
        ApiError.badRequest('Cloudinary URL belongs to a different cloud')
      );
    }

    // Derive Content-Type from the URL extension, fall back to octet-stream.
    const pathname = parsed.pathname.toLowerCase();
    const extMatch = pathname.match(/\.([a-z0-9]{1,8})(?:$|\?)/);
    const ext = extMatch?.[1] || '';
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';

    // Sensible default filename: query.name wins, else the last URL segment.
    const lastSeg = decodeURIComponent(
      parsed.pathname.split('/').pop() || 'download'
    );
    const filename = downloadName || lastSeg;

    https
      .get(rawUrl, (upstream) => {
        if (!upstream.statusCode || upstream.statusCode >= 400) {
          upstream.resume();
          return next(
            new ApiError(upstream.statusCode || 502, 'Upstream fetch failed')
          );
        }

        res.setHeader('Content-Type', mime);
        if (upstream.headers['content-length']) {
          res.setHeader('Content-Length', upstream.headers['content-length']);
        }
        const disposition = inline ? 'inline' : 'attachment';
        // Both `filename` (legacy) and `filename*` (RFC 5987) for unicode.
        const encoded = encodeURIComponent(filename);
        res.setHeader(
          'Content-Disposition',
          `${disposition}; filename="${filename.replace(/"/g, '')}"; filename*=UTF-8''${encoded}`
        );
        // Cloudinary URLs are versioned (immutable) — cache for an hour.
        res.setHeader('Cache-Control', 'public, max-age=3600');

        upstream.pipe(res);
      })
      .on('error', (err) => {
        console.error('[upload/proxy] Upstream error:', err);
        next(new ApiError(502, 'Upstream fetch failed'));
      });
  } catch (err) {
    next(err);
  }
};

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
