/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  // Custom parser to support emoji-prefixed types like "✨ feat(scope): subject"
  parserPreset: {
    parserOpts: {
      headerPattern: /^([^\(:]+?)(?:\(([^)]*)\))?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  rules: {
    'type-enum': [
      2,
      'always',
      [
        '🎉 init', // Initialize project
        '✨ feat', // New feature
        '🐞 fix', // Bug fix
        '📃 docs', // Documentation changes
        '🌈 style', // Code style (formatting, semicolons, etc)
        '🦄 refactor', // Code refactoring
        '🎈 perf', // Performance improvements
        '🧪 test', // Adding or updating tests
        '🔧 build', // Build system or dependency changes
        '🐎 ci', // CI/CD configuration
        '🐳 chore', // Maintenance tasks
        '↩ revert', // Revert a previous commit
      ],
    ],
    // scope is optional; must be lowercase when provided
    'scope-empty': [0, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    // subject must not be empty; no PascalCase/UpperCase
    'subject-empty': [2, 'never'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // body / footer formatting
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
    'header-max-length': [2, 'always', 100],
  },
}
