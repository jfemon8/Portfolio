import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { strictLimiter } from '../middleware/rateLimit.js';
import {
  login,
  refresh,
  logout,
  getMe,
  updatePassword,
  updateProfileMeta,
} from '../controllers/authController.js';

const router = Router();

router.post(
  '/login',
  strictLimiter,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

// Rotation endpoints (refresh cookie is scoped to /api/auth).
router.post('/refresh', refresh);
router.post('/logout', logout);

router.get('/me', protect, getMe);
router.patch('/password', protect, updatePassword);
router.patch('/profile', protect, updateProfileMeta);

export default router;
