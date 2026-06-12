import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';

const router = Router();

router.get('/', listCategories); // public read (seeds defaults on first hit)
router.post('/', protect, adminOnly, createCategory);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

export default router;
