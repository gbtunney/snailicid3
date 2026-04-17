import { type Config, defineConfig } from "@eslint/config-helpers";
import vitestPlugin from "@vitest/eslint-plugin"
import { expandExtensions } from '../../helpers.js'
import {TS_FILE_EXTENSIONS} from '../../shared.js'

export const vitestRules = (): Array<Config> =>
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
