import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  configured = true;
  if (env.cloudinary.configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
  } else {
    console.warn(
      '⚠️  Cloudinary is not configured — image uploads will be disabled. ' +
        'See docs/02-CLOUDINARY-SETUP.md'
    );
  }
}

export type CloudinaryResourceType = 'image' | 'raw' | 'auto';

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: CloudinaryResourceType;
}

export interface UploadResult {
  url: string;
  publicId: string;
  resourceType: string;
}

export function uploadBuffer(
  buffer: Buffer,
  { folder, publicId, resourceType = 'image' }: UploadOptions = {}
): Promise<UploadResult> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    if (!env.cloudinary.configured) {
      return reject(new Error('Cloudinary is not configured on the server.'));
    }
    const isImage = resourceType === 'image';
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || env.cloudinary.folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
        ...(isImage
          ? { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }
          : {}),
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function destroyAsset(
  publicId?: string,
  resourceType?: CloudinaryResourceType
): Promise<void> {
  if (!publicId) return;
  ensureConfigured();
  if (!env.cloudinary.configured) return;
  // The SDK defaults resource_type to 'image', which never matches a raw asset — PDFs would never be deleted, so honour an explicit type or infer 'raw' from the .pdf suffix.
  const type: CloudinaryResourceType =
    resourceType ?? (/\.pdf$/i.test(publicId) ? 'raw' : 'image');
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: type,
      invalidate: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Cloudinary delete failed for ${publicId}: ${msg}`);
  }
}

export default cloudinary;
