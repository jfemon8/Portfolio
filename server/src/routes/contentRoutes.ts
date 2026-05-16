import { Router } from 'express';
import type { Model } from 'mongoose';
import { protect, adminOnly } from '../middleware/auth.js';
import { crudFactory, type CrudOptions } from '../controllers/crudFactory.js';
import { Experience } from '../models/Experience.js';
import { Skill } from '../models/Skill.js';
import { Education } from '../models/Education.js';
import { Certification } from '../models/Certification.js';
import { Publication } from '../models/Publication.js';

/**
 * Mounts a standard public-read / admin-write resource:
 *   GET  /  ·  GET /:id  (public)
 *   POST /  ·  PUT /:id  ·  PATCH /reorder  ·  DELETE /:id  (admin)
 */
function resourceRouter<T>(Model: Model<T>, opts?: CrudOptions): Router {
  const c = crudFactory(Model, opts);
  const r = Router();
  r.get('/', c.list);
  r.get('/:id', c.getOne);
  r.post('/', protect, adminOnly, c.create);
  r.patch('/reorder', protect, adminOnly, c.reorder);
  r.put('/:id', protect, adminOnly, c.update);
  r.delete('/:id', protect, adminOnly, c.remove);
  return r;
}

const router = Router();
router.use('/experience', resourceRouter(Experience));
router.use('/skills', resourceRouter(Skill, { sort: { order: 1, level: -1 } }));
router.use('/education', resourceRouter(Education));
router.use('/certifications', resourceRouter(Certification));
router.use('/publications', resourceRouter(Publication));

export default router;
