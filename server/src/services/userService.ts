import type { Request } from 'express';
import { User, type UserDoc } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { isImmutableSuperAdminEmail } from '../config/superAdmins.js';
import { recordAudit } from './auditService.js';
import { toPublicUser, type PublicUser } from './authService.js';

/** Roles assignable via the API. `superAdmin` is reserved for the hardcoded immutable accounts only — it can never be granted through user management. */
export type AssignableRole = 'admin' | 'visitor';

export async function listUsers(): Promise<PublicUser[]> {
  const users = await User.find().sort({ createdAt: -1 });
  return users.map(toPublicUser);
}

export async function createUser(
  input: {
    name: string;
    email: string;
    password: string;
    role?: AssignableRole;
  },
  req: Request
): Promise<PublicUser> {
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) {
    throw ApiError.conflict('A user with this email already exists.');
  }
  const user = await User.create({
    name: input.name,
    email,
    password: input.password,
    role: input.role === 'visitor' ? 'visitor' : 'admin',
  });
  recordAudit({
    req,
    action: 'user.created',
    actor: req.user?._id,
    actorEmail: req.user?.email,
    role: req.user?.role,
    entity: 'User',
    entityId: user._id.toString(),
    meta: { email: user.email, role: user.role },
  });
  return toPublicUser(user);
}

async function loadTarget(id: string): Promise<UserDoc> {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found.');
  return user;
}

/** Hard invariant: the hardcoded super admins are untouchable. */
function assertMutable(target: UserDoc): void {
  if (
    target.isImmutableSuperAdmin ||
    isImmutableSuperAdminEmail(target.email)
  ) {
    throw ApiError.forbidden(
      'This is a protected super-admin account and cannot be modified.'
    );
  }
}

export async function updateUser(
  id: string,
  patch: { name?: string; role?: AssignableRole; status?: UserDoc['status'] },
  req: Request
): Promise<PublicUser> {
  const target = await loadTarget(id);
  assertMutable(target);

  if (patch.name !== undefined) target.name = patch.name;
  if (patch.role === 'admin' || patch.role === 'visitor') {
    target.role = patch.role;
  }
  if (patch.status === 'active' || patch.status === 'disabled') {
    target.status = patch.status;
  }
  await target.save();

  recordAudit({
    req,
    action: 'user.updated',
    actor: req.user?._id,
    actorEmail: req.user?.email,
    role: req.user?.role,
    entity: 'User',
    entityId: target._id.toString(),
    meta: { role: target.role, status: target.status },
  });
  return toPublicUser(target);
}

export async function deleteUser(id: string, req: Request): Promise<void> {
  const target = await loadTarget(id);
  assertMutable(target);
  if (req.user && target._id.equals(req.user._id)) {
    throw ApiError.forbidden('You cannot delete your own account.');
  }
  await target.deleteOne();
  recordAudit({
    req,
    action: 'user.deleted',
    actor: req.user?._id,
    actorEmail: req.user?.email,
    role: req.user?.role,
    entity: 'User',
    entityId: id,
    meta: { email: target.email },
  });
}
