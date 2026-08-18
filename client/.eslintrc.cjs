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
    {
      // Public surfaces place a shape-matched skeleton in the content's own slot (see ui/Async.tsx); Spinner stays for admin screens and auth gates.
      files: ['src/pages/*.tsx', 'src/components/sections/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@/components/ui/States',
                importNames: ['Spinner'],
                message:
                  'Use <Async> with a skeleton from components/ui/Skeletons instead — a public surface should never block on a spinner.',
              },
            ],
          },
        ],
      },
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
