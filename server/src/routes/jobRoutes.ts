import { Router } from 'express';
import { adminOnly, protect } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cacheControl.js';
import {
  createJob,
  cronSyncJobs,
  deleteJob,
  getPublicJob,
  jobSourceHealth,
  listAdminJobs,
  listJobs,
  syncJobs,
  updateJob,
} from '../controllers/jobController.js';

const router = Router();

router.get('/', cacheControl(120), listJobs);
router.get('/cron', cronSyncJobs);
router.get('/admin', protect, adminOnly, listAdminJobs);
router.post('/admin', protect, adminOnly, createJob);
router.post('/admin/sync', protect, adminOnly, syncJobs);
router.get('/admin/health', protect, adminOnly, jobSourceHealth);
router.put('/admin/:id', protect, adminOnly, updateJob);
router.delete('/admin/:id', protect, adminOnly, deleteJob);
router.get('/:id', cacheControl(120), getPublicJob);

export default router;
