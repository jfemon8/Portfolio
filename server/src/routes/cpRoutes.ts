import { Router } from 'express';
import { cacheControl } from '../middleware/cacheControl.js';
import { cpToolLimiter } from '../middleware/rateLimit.js';
import {
  getCpStats,
  compareCp,
  predictRating,
} from '../controllers/cpController.js';

const router = Router();

// Public — cached competitive-programming stats (Codeforces).
router.get('/', cacheControl(300), getCpStats);

// Public tool — live per-request comparison, not cacheable (arbitrary visitor-entered handles).
router.get('/compare', cpToolLimiter, compareCp);

// Public tool — live per-request rating prediction, not cacheable (standings shift during a running contest).
router.get('/predict', cpToolLimiter, predictRating);

export default router;
