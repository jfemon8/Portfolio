import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { getSite, updateSite } from '../controllers/siteController.js';

const router = Router();

router.get('/', cacheControl(30), getSite); // public
router.put('/', protect, adminOnly, updateSite); // admin

export default router;
