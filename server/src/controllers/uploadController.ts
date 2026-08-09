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

// Admin — resume PDF upload; the public_id gets a .pdf suffix so the CDN URL ends in .pdf and browsers serve it as application/pdf — without it the raw asset URL is extension-less and downloads as a corrupted-looking blob.
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

// Admin — upload an image or a PDF; PDFs get a .pdf-suffixed public_id (same trick as the resume upload) so the CDN URL ends in .pdf and the proxy can serve it inline.
export const uploadMediaHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.badRequest('No file provided.');
    const folder =
      typeof req.query.folder === 'string' && req.query.folder
        ? req.query.folder
        : undefined;

    if (req.file.mimetype === 'application/pdf') {
      const base = (req.file.originalname || 'document')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .toLowerCase()
        .slice(0, 40);
      const publicId = `${base || 'document'}-${Date.now()}.pdf`;
      const result = await uploadBuffer(req.file.buffer, {
        folder: folder || 'portfolio/media',
        publicId,
        resourceType: 'raw',
      });
      res.status(201).json({ success: true, kind: 'pdf', ...result });
      return;
    }

    const result = await uploadBuffer(req.file.buffer, { folder });
    res.status(201).json({ success: true, kind: 'image', ...result });
  }
);

// GET /upload/proxy — streams a Cloudinary file back with the correct Content-Type + Content-Disposition; Cloudinary's raw storage serves everything as application/octet-stream, causing downloads to look corrupted, so this proxy fixes it in one place (SSRF-guarded to our own Cloudinary host).
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

    const pathname = parsed.pathname.toLowerCase();
    const extMatch = pathname.match(/\.([a-z0-9]{1,8})(?:$|\?)/);
    const ext = extMatch?.[1] || '';
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';

    const lastSeg = decodeURIComponent(
      parsed.pathname.split('/').pop() || 'download'
    );
    const filename = downloadName || lastSeg;

    // Extracts publicId + resource/delivery type from the URL (shape: /{cloud}/{resource_type}/{type}/[v{version}/]{publicId…}) so we can request a signed download link — Cloudinary blocks bare delivery of raw PDF/ZIP assets by default (401), so we authenticate via the admin API instead.
    const segments = parsed.pathname.split('/').filter(Boolean);
    segments.shift(); // cloud
    const resourceType = segments.shift() ?? 'raw';
    const deliveryType = segments.shift() ?? 'upload';
    if (segments[0] && /^v\d+$/.test(segments[0])) segments.shift();
    const publicIdWithExt = segments.join('/');

    if (!publicIdWithExt) {
      return next(ApiError.badRequest('Unrecognized Cloudinary URL'));
    }
    if (!env.cloudinary.configured) {
      return next(
        ApiError.badRequest('Cloudinary is not configured on the server.')
      );
    }

    // private_download_url returns a signed admin-API download URL that serves the file authenticated regardless of the public PDF/ZIP delivery policy — our uploaders append .pdf directly to the public_id (e.g. portfolio/resume/resume_xxx-1234.pdf), so we must pass that exact public_id with format left empty, or Cloudinary 404s on a split, non-existent id.
    const upstreamUrl = cloudinary.utils.private_download_url(
      publicIdWithExt,
      '',
      {
        resource_type: resourceType,
        type: deliveryType,
        expires_at: Math.floor(Date.now() / 1000) + 60,
      }
    );

    // Cloudinary's admin download endpoint sometimes 302-redirects to the actual file location — follow up to 3 hops (direct hits work fine on the first iteration).
    const fetchUpstream = (urlToFetch: string, redirectsLeft: number): void => {
      https
        .get(urlToFetch, (upstream) => {
          const status = upstream.statusCode ?? 0;
          if (
            status >= 300 &&
            status < 400 &&
            upstream.headers.location &&
            redirectsLeft > 0
          ) {
            upstream.resume();
            const nextUrl = new URL(
              upstream.headers.location,
              urlToFetch
            ).toString();
            return fetchUpstream(nextUrl, redirectsLeft - 1);
          }
          if (status >= 400) {
            upstream.resume();
            console.error('[upload/proxy] Upstream', status, 'for', urlToFetch);
            return next(new ApiError(status, 'Upstream fetch failed'));
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
    };

    fetchUpstream(upstreamUrl, 3);
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
