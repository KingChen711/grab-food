/** @type {import('prettier').Config} */
const config = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  overrides: [
    {
      files: '*.json',
      options: { printWidth: 200 },
    },
    {
      // Only apply tailwind plugin to files inside packages/ui and apps
      files: ['packages/ui/src/**/*.{ts,tsx}', 'apps/**/*.{ts,tsx}'],
      options: {
        plugins: ['prettier-plugin-tailwindcss'],
        tailwindConfig: './packages/ui/tailwind.config.ts',
      },
    },
  ],
}

module.exports = config
