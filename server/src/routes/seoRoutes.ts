import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { getSeo, updateSeo } from '../controllers/seoController.js';

const router = Router();

router.get('/', cacheControl(60), getSeo); // public
router.put('/', protect, adminOnly, updateSeo); // admin

export default router;
