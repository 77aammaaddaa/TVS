import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'build',
    '*.js',          // V14 legacy files at root
    'files/**/*',    // V14 legacy files directory
    'archive/**/*',  // archived legacy files
    '__tests__/**/*', // test files
    'plans/**/*'     // documentation
  ]),
  {
    files: ['src/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}', 'modules/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
