import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, requireSuperAdmin } from '../middleware/auth.js';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';

// Super-admin only; immutable super admins are protected at the service layer and the superAdmin role is never assignable here.
const router = Router();

router.use(protect, requireSuperAdmin);

router.get('/', listUsers);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'visitor'])
      .withMessage('Role must be admin or visitor'),
  ],
  validate,
  createUser
);

router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('role').optional().isIn(['admin', 'visitor']),
    body('status').optional().isIn(['active', 'disabled']),
  ],
  validate,
  updateUser
);

router.delete('/:id', deleteUser);

export default router;
