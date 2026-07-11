import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { strictLimiter } from '../middleware/rateLimit.js';
import {
  submitMessage,
  listMessages,
  updateMessage,
  deleteMessage,
  replyToMessage,
} from '../controllers/messageController.js';

const router = Router();

router.post(
  '/',
  strictLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Message must be at least 10 characters'),
  ],
  validate,
  submitMessage
);

router.get('/', protect, adminOnly, listMessages);
router.patch('/:id', protect, adminOnly, updateMessage);
router.delete('/:id', protect, adminOnly, deleteMessage);
router.post(
  '/:id/reply',
  protect,
  adminOnly,
  [
    body('body').trim().notEmpty().withMessage('Reply message is required'),
    body('subject').optional().isString().trim(),
  ],
  validate,
  replyToMessage
);

export default router;
