import {
  type Config,
  defineConfig as eslintDefineConfig,
} from "@eslint/config-helpers";
import {
  type ConfigFunctionOptions,
  type ConfigToolApi,
} from "../core/index.js";
import { buildDefaultEslintConfig } from "./base.js";

export type EsLintConfig = Array<Config>;

export type EsLintConfigFunctionOptions = ConfigFunctionOptions<{
  /** Appended to `BASE_IGNORES`. */
  ignores?: Array<string>;
  /** Extra flat-config objects appended last. */
  overrides?: Array<Config>;
}>;

export const defineEsLintConfig = eslintDefineConfig;

export const buildEsLintConfigFunction = ({
  cwd = process.cwd(),
  ignores = [],
  overrides = [],
}: EsLintConfigFunctionOptions = {}): EsLintConfig => {
  return defineEsLintConfig(
    ...buildDefaultEslintConfig({ cwd, globalIgnores: ignores }),
    ...overrides,
  );
};

export const EsLint = {
  config: buildEsLintConfigFunction,
  defineConfig: defineEsLintConfig,
} satisfies ConfigToolApi<
  EsLintConfig,
  EsLintConfigFunctionOptions,
  typeof defineEsLintConfig,
  object
>;
