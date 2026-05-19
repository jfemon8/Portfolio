import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { getSite, updateSite } from '../controllers/siteController.js';

const router = Router();

router.get('/', getSite); // public
router.put('/', protect, adminOnly, updateSite); // admin

export default router;
