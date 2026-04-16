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
      }
    },
    name: "Vitest: Recommended, Typecheck enabled",
    rules: {
      ...vitestPlugin.configs.recommended.rules
    },
    settings: {
      vitest: {
        typecheck: true
      }
    }
  });
