import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const router = Router();

router.get('/', getProfile); // public
router.put('/', protect, adminOnly, updateProfile); // admin

export default router;
