import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadImage, uploadDoc } from '../middleware/upload.js';
import {
  uploadImageHandler,
  uploadResumeHandler,
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
router.get('/assets', protect, adminOnly, listAssetsHandler);
router.delete('/asset', protect, adminOnly, deleteAssetHandler);

// Public — proxies Cloudinary raw assets (PDFs/docs) with the correct
// Content-Type so browsers preview / download them properly. SSRF-guarded
// inside the handler to our own Cloudinary cloud.
router.get('/proxy', proxyFileHandler);

export default router;
