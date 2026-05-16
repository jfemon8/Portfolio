import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  listProjects,
  getProjectBySlug,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';

const router = Router();

router.get('/', listProjects); // public
router.get('/slug/:slug', getProjectBySlug); // public detail
router.get('/:id', protect, adminOnly, getProjectById); // admin edit
router.post('/', protect, adminOnly, createProject);
router.put('/:id', protect, adminOnly, updateProject);
router.delete('/:id', protect, adminOnly, deleteProject);

export default router;
