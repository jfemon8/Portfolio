import { Router } from 'express';
import { body } from 'express-validator';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { blogEngagementLimiter } from '../middleware/rateLimit.js';
import {
  BLOG_REACTIONS,
  listPublished,
  getPublishedBySlug,
  reactToPost,
  commentOnPost,
  listAll,
  getById,
  create,
  update,
  remove,
} from '../controllers/blogController.js';

const router = Router();

// Public
router.get('/', listPublished);
router.get('/slug/:slug', getPublishedBySlug);
router.post(
  '/slug/:slug/reactions',
  blogEngagementLimiter,
  [
    body('reaction').isIn(BLOG_REACTIONS).withMessage('Reaction is required'),
    body('visitorKey').trim().notEmpty().withMessage('Visitor key is required'),
  ],
  validate,
  reactToPost
);
router.post(
  '/slug/:slug/comments',
  blogEngagementLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
      .optional({ values: 'falsy' })
      .isEmail()
      .withMessage('Valid email is required'),
    body('content')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Comment must be at least 3 characters'),
    body('parentCommentId')
      .optional({ values: 'falsy' })
      .isMongoId()
      .withMessage('Invalid parent comment'),
  ],
  validate,
  commentOnPost
);

// Admin
router.get('/admin/all', protect, adminOnly, listAll);
router.get('/admin/:id', protect, adminOnly, getById);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);

export default router;
