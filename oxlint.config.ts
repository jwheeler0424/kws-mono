import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['typescript', 'react', 'react-perf', 'import', 'jsdoc', 'jsx-a11y', 'vitest'],
  rules: {
    'typescript/no-floating-promises': ['error', { ignoreVoid: true }],
    'typescript/no-useless-default-assignment': 'off',
    'import/no-cycle': ['error', { maxDepth: 3 }],
    'react/no-children-prop': 'off', // We often need to pass components as children for layout purposes
    'jsx-a11y/anchor-has-content': 'off', // We use custom Link components that may not always have content, but are still accessible
    'jsx-a11y/anchor-is-valid': 'off', // We use custom Link components that may not always have valid hrefs, but are still accessible
    'jsx-a11y/no-autofocus': 'off', // Autofocus is often desirable in forms and modals for better UX
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/prefer-tag-over-role': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/.tanstack/**',
    '**/.turbo/**',
    '**/.next/**',
    '**/.output/**',
    '**/dist/**',
    '**/coverage/**',
    '**/vendor/**',
    '**/test/snapshots/**',
    '**/graveyard/**',
    '**/widgets/**',
  ],
});
