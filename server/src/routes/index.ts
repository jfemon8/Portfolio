import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import profileRoutes from './profileRoutes.js';
import seoRoutes from './seoRoutes.js';
import siteRoutes from './siteRoutes.js';
import siteContentRoutes from './siteContentRoutes.js';
import projectRoutes from './projectRoutes.js';
import contentRoutes from './contentRoutes.js';
import blogRoutes from './blogRoutes.js';
import messageRoutes from './messageRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import auditRoutes from './auditRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import cpRoutes from './cpRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import jobRoutes from './jobRoutes.js';
import { getSitemap } from '../controllers/sitemapController.js';
import { getRobots } from '../controllers/siteMetaController.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

// Dynamic sitemap / robots, served at the site origin via vercel.json rewrites.
router.get('/sitemap.xml', getSitemap);
router.get('/robots.txt', getRobots);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/seo', seoRoutes);
router.use('/site', siteRoutes);
router.use('/site-content', siteContentRoutes);
router.use('/projects', projectRoutes);
router.use('/blog', blogRoutes);
router.use('/messages', messageRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit', auditRoutes);
router.use('/upload', uploadRoutes);
router.use('/cp', cpRoutes);
router.use('/categories', categoryRoutes);
router.use('/jobs', jobRoutes);
router.use('/', contentRoutes); // /experience /skills /education /certifications /publications

export default router;
