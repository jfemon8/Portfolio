import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { track, summary } from '../controllers/analyticsController.js';

const router = Router();

router.post('/track', track); // public, fire-and-forget
router.get('/summary', protect, adminOnly, summary); // admin dashboard

export default router;
