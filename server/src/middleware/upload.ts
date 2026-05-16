import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

/**
 * Memory storage — files stream straight to Cloudinary, never to disk
 * (Vercel's serverless filesystem is read-only).
 */
const storage = multer.memoryStorage();

const ALLOWED_IMAGES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGES.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Only JPG, PNG, WEBP, GIF or SVG images are allowed.'));
  },
});

export const uploadDoc = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(ApiError.badRequest('Only PDF files are allowed.'));
  },
});
