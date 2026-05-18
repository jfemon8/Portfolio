import { Router } from 'express';
import { protect, requireSuperAdmin } from '../middleware/auth.js';
import { listAudit } from '../controllers/auditController.js';

/** Audit trail — SUPER ADMIN ONLY (read-only; entries are written by
 *  auditService throughout the app). */
const router = Router();

router.use(protect, requireSuperAdmin);
router.get('/', listAudit);

export default router;
