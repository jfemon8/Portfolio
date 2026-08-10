import { Router } from 'express';
import { body, param } from 'express-validator';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { blogEngagementLimiter } from '../middleware/rateLimit.js';
import { cacheControl } from '../middleware/cacheControl.js';
import {
  BLOG_REACTIONS,
  listPublished,
  getPublishedBySlug,
  getPostComments,
  reactToPost,
  reactToComment,
  commentOnPost,
  listAll,
  getById,
  create,
  update,
  remove,
  updateComment,
  removeComment,
} from '../controllers/blogController.js';

const router = Router();

// Public
router.get('/', cacheControl(60), listPublished);
router.get('/slug/:slug', getPublishedBySlug); // increments views — never cache
router.get('/slug/:slug/comments', getPostComments);
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
router.post(
  '/slug/:slug/comments/:commentId/reactions',
  blogEngagementLimiter,
  [
    param('commentId').isMongoId().withMessage('Comment id is required'),
    body('reaction').isIn(BLOG_REACTIONS).withMessage('Reaction is required'),
    body('visitorKey').trim().notEmpty().withMessage('Visitor key is required'),
  ],
  validate,
  reactToComment
);

// Admin
router.get('/admin/all', protect, adminOnly, listAll);
router.get('/admin/:id', protect, adminOnly, getById);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);
router.put('/admin/comments/:id', protect, adminOnly, updateComment);
router.delete('/admin/comments/:id', protect, adminOnly, removeComment);

export default router;
