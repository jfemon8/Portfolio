import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { trackingLimiter } from '../middleware/rateLimit.js';
import { track, summary } from '../controllers/analyticsController.js';

const router = Router();

router.post('/track', trackingLimiter, track);
router.get('/summary', protect, adminOnly, summary);

export default router;
