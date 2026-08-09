import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadImage, uploadDoc, uploadMedia } from '../middleware/upload.js';
import {
  uploadImageHandler,
  uploadResumeHandler,
  uploadMediaHandler,
  deleteAssetHandler,
  listAssetsHandler,
  proxyFileHandler,
} from '../controllers/uploadController.js';

const router = Router();

router.post(
  '/image',
  protect,
  adminOnly,
  uploadImage.single('image'),
  uploadImageHandler
);
router.post(
  '/resume',
  protect,
  adminOnly,
  uploadDoc.single('resume'),
  uploadResumeHandler
);
router.post(
  '/media',
  protect,
  adminOnly,
  uploadMedia.single('file'),
  uploadMediaHandler
);
router.get('/assets', protect, adminOnly, listAssetsHandler);
router.delete('/asset', protect, adminOnly, deleteAssetHandler);

// Public; proxies Cloudinary raw assets with the correct Content-Type for preview/download. SSRF-guarded to our own Cloudinary cloud.
router.get('/proxy', proxyFileHandler);

export default router;
