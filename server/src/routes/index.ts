import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import profileRoutes from './profileRoutes.js';
import projectRoutes from './projectRoutes.js';
import contentRoutes from './contentRoutes.js';
import blogRoutes from './blogRoutes.js';
import messageRoutes from './messageRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import auditRoutes from './auditRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import cpRoutes from './cpRoutes.js';
import { getSitemap } from '../controllers/sitemapController.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

// Public, dynamic XML sitemap (served at the site origin via vercel.json).
router.get('/sitemap.xml', getSitemap);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/projects', projectRoutes);
router.use('/blog', blogRoutes);
router.use('/messages', messageRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit', auditRoutes);
router.use('/upload', uploadRoutes);
router.use('/cp', cpRoutes);
router.use('/', contentRoutes); // /experience /skills /education /certifications /publications

export default router;
