import { nestjsConfig } from "@grab/config/eslint/nestjs";
import tsParser from "@typescript-eslint/parser";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "**/*.spec.ts", "**/*.js"],
  },
  ...nestjsConfig,
  {
    files: ["src/**/*.ts", "!src/**/*.spec.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
];
