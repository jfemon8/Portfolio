/**
 * Hardcoded, immutable super admins.
 *
 * These accounts can NEVER (via any API/UI):
 *  - be deleted, disabled, or demoted
 *  - lose super-admin permissions
 * They are always re-asserted as { role: 'superAdmin', status: 'active',
 * isImmutableSuperAdmin: true } on save and on seed. Admins cannot touch them.
 *
 * Source of truth — referenced by the User model guard, userService and seed.
 */
export const IMMUTABLE_SUPER_ADMINS: readonly string[] = [
  'jfemon8@gmail.com',
  'emon.cse6.bu@gmail.com',
].map((e) => e.toLowerCase());

export const isImmutableSuperAdminEmail = (email?: string | null): boolean =>
  !!email && IMMUTABLE_SUPER_ADMINS.includes(email.toLowerCase());
