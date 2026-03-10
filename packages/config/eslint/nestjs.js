import { baseConfig } from './base.js'
import tsPlugin from '@typescript-eslint/eslint-plugin'

/** @type {import('eslint').Linter.Config[]} */
export const nestjsConfig = [
  ...baseConfig,
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // NestJS / Node.js specific
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],
      '@typescript-eslint/no-floating-promises': 'error',

      // NestJS DI requires runtime class references for injection tokens.
      // `prefer: 'type-imports'` + auto-fix converts injectable classes to
      // `import type`, which erases the runtime metadata and breaks DI.
      // Disabled here so developers explicitly choose when to use `import type`.
      '@typescript-eslint/consistent-type-imports': 'off',

      // Disable unicorn rules that conflict with NestJS patterns
      'unicorn/prefer-node-protocol': 'off',

      // Allow console in backend (we use Logger service)
      'no-console': 'off',
    },
  },
]
