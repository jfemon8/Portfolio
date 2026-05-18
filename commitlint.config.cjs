/**
 * Conventional Commits enforced via commitlint + Husky.
 * e.g. "feat(hero): add magnetic CTA", "fix(auth): rotate refresh token"
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'style',
        'docs',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'subject-case': [0],
  },
};
