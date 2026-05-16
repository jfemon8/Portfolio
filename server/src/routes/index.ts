import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import projectRoutes from './projectRoutes.js';
import contentRoutes from './contentRoutes.js';
import blogRoutes from './blogRoutes.js';
import messageRoutes from './messageRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import uploadRoutes from './uploadRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/projects', projectRoutes);
router.use('/blog', blogRoutes);
router.use('/messages', messageRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/upload', uploadRoutes);
router.use('/', contentRoutes); // /experience /skills /education /certifications /publications

export default router;
