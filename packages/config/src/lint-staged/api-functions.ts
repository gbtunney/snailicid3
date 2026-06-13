import { type Configuration } from "lint-staged";
import {
  type ConfigToolApi,
  defineConfig,
  type IdentityDefineConfig,
} from "../core/index.js";
import {
  filterFileArrByGlob,
  JSLIKE_FILE_EXTENSIONS,
  PRETTIER_FILE_EXTENSIONS,
} from "./../shared.js";

export type LintStagedConfig = Configuration;

export type LintStagedConfigFunctionOptions = LintStagedConfig & {
  /** Reserved for consistency with other config builders. */
  cwd?: string;
};

export const defineLintStagedConfig = <const TConfig extends LintStagedConfig>(
  config: TConfig,
): TConfig => defineConfig(config);

export const extensionsToGlob = (extensions: ReadonlyArray<string>): string =>
  `*.{${extensions.join(",")}}`;

export const quoteArg = (path: string): string =>
  `"${path.replaceAll('"', '\\"')}"`;

export const toFileArgs = (
  staged: ReadonlyArray<string> | string,
): Array<string> => (Array.isArray(staged) ? staged : [staged]).map(quoteArg);

export const buildLintStagedConfigFunction = (
  options: LintStagedConfigFunctionOptions = {},
): LintStagedConfig => {
  const { cwd: _cwd, ...overrides } = options;
  const config: LintStagedConfig = {
    ".gitignore": "pnpm exec prettier --write .gitignore",

    ".husky/**/*": (staged: ReadonlyArray<string>) => {
      const files = toFileArgs(staged);
      return `pnpm exec prettier --write ${files.join(" ")}`;
    },

    "*.md": (staged: ReadonlyArray<string>) => {
      const filtered = filterFileArrByGlob(staged, ["**/*.api.md"], true);
      const files = toFileArgs(filtered);
      if (files.length === 0) return [];
      return [
        `pnpm exec prettier --write ${files.join(" ")}`,
        `pnpm exec markdownlint-cli2 --no-globs --fix ${files.join(" ")} || true`,
      ];
    },

    [extensionsToGlob(JSLIKE_FILE_EXTENSIONS)]: (
      staged: ReadonlyArray<string>,
    ) => {
      const files = toFileArgs(staged);
      return [
        `pnpm exec prettier --write ${files.join(" ")}`,
        `pnpm exec eslint --fix ${files.join(" ")}`,
      ];
    },

    [extensionsToGlob(PRETTIER_FILE_EXTENSIONS)]: (
      staged: ReadonlyArray<string>,
    ) => {
      const filtered = filterFileArrByGlob(staged, ["**/*.api.md"], true);
      const files = toFileArgs(filtered);
      if (files.length === 0) return [];
      return `pnpm exec prettier --write ${files.join(" ")}`;
    },
  };

  return defineLintStagedConfig({ ...config, ...overrides });
};

export const LintStaged = {
  config: buildLintStagedConfigFunction,
  defineConfig: defineLintStagedConfig,
  extensionsToGlob,
  filterFileArrByGlob,
  quoteArg,
  toFileArgs,
} satisfies ConfigToolApi<
  LintStagedConfig,
  LintStagedConfigFunctionOptions,
  IdentityDefineConfig<LintStagedConfig>,
  {
    extensionsToGlob: typeof extensionsToGlob;
    filterFileArrByGlob: typeof filterFileArrByGlob;
    quoteArg: typeof quoteArg;
    toFileArgs: typeof toFileArgs;
  }
>;
