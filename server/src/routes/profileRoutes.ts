import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const router = Router();

router.get('/', cacheControl(30), getProfile); // public
router.put('/', protect, adminOnly, updateProfile); // admin

export default router;
