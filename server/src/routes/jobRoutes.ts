import { Router } from 'express';
import { adminOnly, protect } from '../middleware/auth.js';
import { cacheControl } from '../middleware/cacheControl.js';
import { trackingLimiter } from '../middleware/rateLimit.js';
import {
  createJob,
  cronSyncJobs,
  deleteJob,
  getJobTracker,
  getPublicJob,
  jobSourceHealth,
  jobSyncRuns,
  listAdminJobs,
  listJobs,
  putJobTracker,
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
router.get('/admin/runs', protect, adminOnly, jobSyncRuns);
router.put('/admin/:id', protect, adminOnly, updateJob);
router.delete('/admin/:id', protect, adminOnly, deleteJob);
// Anonymous per-device tracker; two path segments keep it clear of the `/:id` route below.
router.get('/track/:deviceId', trackingLimiter, getJobTracker);
router.put('/track/:deviceId', trackingLimiter, putJobTracker);
router.get('/:id', cacheControl(120), getPublicJob);

export default router;
