import vitestPlugin from "@vitest/eslint-plugin"
import { expandExtensions } from '../../helpers.js'
import {TS_FILE_EXTENSIONS} from '../../shared.js'
import { defineConfig, type Config } from "@eslint/config-helpers";

export const vitestRules = (): Config[] =>
  defineConfig({
    files: [...expandExtensions(TS_FILE_EXTENSIONS, '**/*.test.')],
    languageOptions: {
      globals: {
        ...vitestPlugin.environments.env.globals
      },
      parserOptions: {
        project: false,
      },
    },
    name: "Vitest: Recommended",
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      'vitest/valid-title': 'off',
    },
  });
