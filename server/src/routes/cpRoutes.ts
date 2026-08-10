import { Router } from 'express';
import { cacheControl } from '../middleware/cacheControl.js';
import { getCpStats } from '../controllers/cpController.js';

const router = Router();

// Public — cached competitive-programming stats (Codeforces).
router.get('/', cacheControl(300), getCpStats);

export default router;
