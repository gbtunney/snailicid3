import type { UserConfig as CommitlintUserConfig } from "@commitlint/types";
import { merge as deepMerge } from "ts-deepmerge";
import type { LiteralUnion } from "type-fest";
import {
  type ConfigFunctionOptions,
  type ConfigToolApi,
  defineConfig,
  type IdentityDefineConfig,
} from "../core/index.js";
import { commitlintDefaultConfig } from "./base.js";
import {
  COMMIT_TYPES,
  filterCommitTypes,
  type ConventionalCommitType,
} from "./types.js";
import {
  workspaceScopes,
  workspaceScopesCsv,
  type WorkspaceScopesOptions,
} from "./workspace.scopes.js";

export type CommitlintConfig = CommitlintUserConfig;

export type CommitlintConfigFunctionOptions = ConfigFunctionOptions<{
  /** Appended to `commitTypes` for the `type-enum` rule. */
  appendTypes?: Array<LiteralUnion<ConventionalCommitType, string>>;
  /** Forwarded to `workspaceScopes()` for the `scope-enum` rule. */
  appendScopes?: WorkspaceScopesOptions;
  /** Backwards-compatible alias for `appendScopes`. */
  scopeOptions?: WorkspaceScopesOptions;
  /** Merged on top of the default config and computed enum rules. */
  overrides?: CommitlintConfig;
}>;

export const defineCommitlintConfig = <const TConfig extends CommitlintConfig>(
  config: TConfig,
): TConfig => defineConfig(config);

export const buildCommitlintConfigFunction = ({
  appendTypes = [],
  appendScopes,
  scopeOptions,
  overrides = {},
}: CommitlintConfigFunctionOptions = {}): CommitlintConfig => {
  const scopes = workspaceScopes(appendScopes ?? scopeOptions);
  const typeEnum = [...new Set([...COMMIT_TYPES, ...appendTypes])];

  const enumRules = {
    rules: {
      "scope-enum": [2, "always", scopes],
      "type-enum": [2, "always", typeEnum],
    },
  } satisfies CommitlintConfig;

  return deepMerge.withOptions(
    { mergeArrays: false },
    commitlintDefaultConfig,
    enumRules,
    overrides,
  ) as CommitlintConfig;
};

export const Commitlint = {
  commitTypes: COMMIT_TYPES,
  config: buildCommitlintConfigFunction,
  defineConfig: defineCommitlintConfig,
  filterCommitTypes,
  workspaceScopes,
  workspaceScopesCsv,
} satisfies ConfigToolApi<
  CommitlintConfig,
  CommitlintConfigFunctionOptions,
  IdentityDefineConfig<CommitlintConfig>,
  {
    commitTypes: typeof COMMIT_TYPES;
    filterCommitTypes: typeof filterCommitTypes;
    workspaceScopes: typeof workspaceScopes;
    workspaceScopesCsv: typeof workspaceScopesCsv;
  }
>;
