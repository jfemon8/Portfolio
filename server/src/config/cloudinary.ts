import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

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

/** Upload an in-memory file buffer (from multer) to Cloudinary. */
export function uploadBuffer(
  buffer: Buffer,
  { folder, publicId, resourceType = 'image' }: UploadOptions = {}
): Promise<UploadResult> {
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

export async function destroyAsset(publicId?: string): Promise<void> {
  if (!publicId || !env.cloudinary.configured) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Cloudinary delete failed for ${publicId}: ${msg}`);
  }
}

export default cloudinary;
