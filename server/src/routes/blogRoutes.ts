import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  listPublished,
  getPublishedBySlug,
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

// Admin
router.get('/admin/all', protect, adminOnly, listAll);
router.get('/admin/:id', protect, adminOnly, getById);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);

export default router;
