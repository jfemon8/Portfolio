module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  plugins: ['@typescript-eslint', 'react-refresh'],
  rules: {
    'react/prop-types': 'off',
    // React already escapes text safely; this rule is noisy for copy-heavy UI.
    'react/no-unescaped-entities': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      // Build/config files run in Node, not the browser.
      files: [
        'vite.config.ts',
        '*.cjs',
        'postcss.config.js',
        'tailwind.config.js',
      ],
      env: { node: true, browser: false },
    },
    {
      // ShadCN/UI vendored primitives intentionally co-export `*Variants`
      // (cva) with the component — standard ShadCN convention.
      files: ['src/components/ui/**/*.{ts,tsx}'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
    {
      // Web Worker scope — no `window`/DOM, has `self`/`postMessage` instead.
      files: ['src/workers/**/*.ts'],
      env: { worker: true, browser: false },
    },
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '.eslintrc.cjs',
    'postcss.config.js',
    'tailwind.config.js',
  ],
};
