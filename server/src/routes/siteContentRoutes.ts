import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cacheControl.js';
import {
  getSiteContent,
  updateSiteContent,
} from '../controllers/siteContentController.js';

const router = Router();

router.get('/', cacheControl(30), getSiteContent); // public
router.put('/', protect, adminOnly, updateSiteContent); // admin

export default router;
