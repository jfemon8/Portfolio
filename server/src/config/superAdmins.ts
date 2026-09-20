// Hardcoded, immutable super admins that can never be deleted, disabled or demoted through any API, re-asserted on save and seed.
export const IMMUTABLE_SUPER_ADMINS: readonly string[] = [
  'jfemon8@gmail.com',
  'emon.cse6.bu@gmail.com',
].map((e) => e.toLowerCase());

export const isImmutableSuperAdminEmail = (email?: string | null): boolean =>
  !!email && IMMUTABLE_SUPER_ADMINS.includes(email.toLowerCase());
