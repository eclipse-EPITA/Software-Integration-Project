// eslint.config.js
import js from '@eslint/js'

export default [
  {
    ignores: ['node_modules', 'dist', 'build', '.husky'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        require: true,
        module: true,
        process: true,
        console: true,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
]
