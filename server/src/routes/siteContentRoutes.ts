import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getSiteContent,
  updateSiteContent,
} from '../controllers/siteContentController.js';

const router = Router();

router.get('/', getSiteContent); // public
router.put('/', protect, adminOnly, updateSiteContent); // admin

export default router;
