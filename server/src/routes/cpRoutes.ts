import { Router } from 'express';
import { getCpStats } from '../controllers/cpController.js';

const router = Router();

// Public — cached competitive-programming stats (Codeforces).
router.get('/', getCpStats);

export default router;
