// Hardcoded, immutable super admins — can never be deleted/disabled/demoted via any API/UI; re-asserted as { role: 'superAdmin', status: 'active', isImmutableSuperAdmin: true } on save/seed. Source of truth for the User model guard, userService and seed.
export const IMMUTABLE_SUPER_ADMINS: readonly string[] = [
  'jfemon8@gmail.com',
  'emon.cse6.bu@gmail.com',
].map((e) => e.toLowerCase());

export const isImmutableSuperAdminEmail = (email?: string | null): boolean =>
  !!email && IMMUTABLE_SUPER_ADMINS.includes(email.toLowerCase());
