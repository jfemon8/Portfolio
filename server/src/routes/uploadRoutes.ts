import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadImage, uploadDoc } from '../middleware/upload.js';
import {
  uploadImageHandler,
  uploadResumeHandler,
  deleteAssetHandler,
  listAssetsHandler,
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

export default router;
