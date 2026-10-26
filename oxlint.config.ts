import { defineConfig } from 'oxlint'
import {
  RECOMMENDED_RULES,
  TANSTACK_QUERY_RULES,
  TANSTACK_START_RULES,
} from 'oxlint-plugin-react-doctor'

export default defineConfig({
  plugins: ['typescript', 'unicorn', 'oxc', 'import', 'react', 'react-perf', 'jsx-a11y', 'vitest'],
  jsPlugins: [{ name: 'react-doctor', specifier: 'oxlint-plugin-react-doctor' }],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
    perf: 'warn',
  },
  rules: {
    ...RECOMMENDED_RULES,
    ...TANSTACK_START_RULES,
    ...TANSTACK_QUERY_RULES,
    'import/no-unassigned-import': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-no-useless-fragment': 'warn',
    'react/no-array-index-key': 'warn',
    'react-perf/jsx-no-new-object-as-prop': 'off',
    'react-perf/jsx-no-new-function-as-prop': 'off',
    // Inline JSX values are idiomatic here and are not passed to memoized component trees.
    'react-doctor/jsx-no-jsx-as-prop': 'off',
    'react-doctor/jsx-no-new-array-as-prop': 'off',
    'react-doctor/jsx-no-new-function-as-prop': 'off',
    'react-doctor/jsx-no-new-object-as-prop': 'off',
    // React Doctor does not resolve fragment targets rendered by sibling route components.
    'react-doctor/anchor-target-exists': 'off',
  },
  env: {
    builtin: true,
    browser: true,
    node: true,
  },
  overrides: [
    {
      files: ['src/routes/**/*.tsx'],
      // TanStack route modules export Route while keeping their render component local.
      rules: { 'react-doctor/only-export-components': 'off' },
    },
    {
      files: ['src/components/documents/document-viewer.tsx'],
      // useVirtualizer intentionally returns functions that the React Compiler cannot memoize.
      rules: { 'react/incompatible-library': 'off' },
    },
    {
      files: ['src/routes/api/v1/documents/$documentId/events.ts', 'scripts/live-updates-load.ts'],
      // Streaming protocols intentionally await ordered reads inside bounded connection loops.
      rules: {
        'eslint/no-await-in-loop': 'off',
        'eslint/no-unmodified-loop-condition': 'off',
      },
    },
  ],
})
