# @snailicid3/config

## 0.1.3

### Patch Changes

- a3344a4: Add API Extractor config support and tighten the shared config builder API.

  - Added `ApiExtractor` config helpers, API Extractor option types, and base rule exports.
  - Standardized config tools around explicit `cwd` handling with the shared `ConfigBuilder`,
    `ConfigCwd`, and resolved options types.
  - Expanded path and JSON utilities with normalized path helpers, object/value guards, object
    import helpers, and typed JSON serialization helpers.
  - Refreshed the generated API reports for `@snailicid3/config` and `@snailicid3/cli-app`.

## 0.1.2

### Patch Changes

- bbb57f4: Clean up the shared config tool APIs and plugin helpers.

  `@snailicid3/config` now exposes a more consistent namespace shape across config tools, with each
  tool providing `config(...)` for generated/default config and `defineConfig(...)` for typed
  authored config. Internal builder helpers are no longer part of the public root API, Markdownlint
  config types are exported, and the internal tool registry now proves namespace conformance while
  exposing registry entry types for native config/function options.

  Prettier plugin helpers were reorganized around clearer names. The confusing `builtIn`, `bundled`,
  and `list` plugin helpers were replaced with `Prettier.plugins.default()` and
  `Prettier.plugins.packageNames()`, backed by a renamed plugin registry module.
  `useResolvedPlugins` was added as the clearer option name while keeping existing behavior
  compatible.

  TypeDoc config moved into `@snailicid3/config` and now follows the same namespace format,
  including `Typedoc.config(...)`, `Typedoc.defineConfig(...)`, and focused
  markdown/material-theme/vitepress helpers. TypeDoc plugin package names are centralized in a
  registry instead of being scattered across presets, including VitePress theme support.

  Typedoc consumers in `@snailicid3/build-config` were updated to use the new config package
  helpers, and the commitlint CLI integration test timeout was increased to avoid false failures
  under Nx/Vitest coverage.

## 0.1.1

### Patch Changes

- 096b1da: Updated dependencies, testing release action

## 0.1.0

### Minor Changes

- bbc7d8e: Updated the shared config API and added first-class Vite build-config support.

  For `@snailicid3/config`:

  - Added a shared core module with `ConfigApi`, `DefineConfig`, and `defineConfig`.
  - Standardized Prettier, EsLint, Markdownlint, and Commitlint around the same
    `Tool.config(options?)` and `Tool.defineConfig(...)` API shape.
  - Moved tool-specific extras under namespaced sub-objects such as `options`, `overrides`,
    `plugins`, `rules`, and `files`.
  - Removed the old lowercase/snake_case names and positional-argument APIs, including `commitlint`,
    `markdownlint`, `commit_types`, `configuration`, `flatEslintConfig`, and
    `prettierConfiguration`.
  - Updated root config consumers to the new API shape.
  - Added a scoped commit escape hatch so `commit:direct` keeps generated commit scopes while
    skipping only the `lint-staged` step.
  - Added merge-behavior coverage for each tool config builder.
  - Regenerated the API report and refreshed README examples.

  For `@snailicid3/build-config`:

  - Expanded the Vite adapter into a build-plan driven config adapter with app and library support.
  - Added deterministic Vite library output names, DTS plugin wiring, and the public `viteAdapter`.
  - Added a React/Vite playground using the same `defineBuildPlan(...)` plus `toViteConfig(...)`
    pattern as tsdown configs.
  - Updated shared React/TSX lint handling so the playground lint/fix path works with ESLint 10.

## 0.0.7

### Patch Changes

- 95815ae: - Improved shell logging and completion output behavior in config scripts.
  - Added commitlint support and convenience scripts.
  - Added bootstrap support for shell scripts across config/root.
  - Fixed and restored preferred shell handling, including zsh-related flow.
  - Updated dependencies across the monorepo, including build-config and config.
  - Centralized release automation through `call-release-plan.yml` and added detector outputs for
    pending changeset slugs to drive release branch naming.
  - Added optional `disable_nx_cloud` pipeline input that overrides `vars.DISABLE_NX_CLOUD` when set
    and falls back to the repo variable when unset.

## 0.0.6

### Patch Changes

- c6e5ad8: - improve shared build configuration and package export handling
  - refine CLI application utilities and internal tooling
  - improve color utility helpers and palette-related logic
  - update shared configuration utilities and generated configs
  - improve logger formatting and supporting utilities
  - refine Node.js utility helpers and runtime support
  - improve shared TypeScript utility types
  - clean up general utility helpers and internal DX improvements
  - add changeset branch helper tooling for scoped changeset commits

## 0.0.5

### Patch Changes

- 576b75e: Improve config package portability across GitHub Actions, local package execution, and
  release validation workflows.

  Updates shared reporting scripts to respect an existing `ROOT_DIR`, use the published `snail-sh`
  bin through `pnpm exec`, tolerate missing `packages` or `apps` directories, and skip the expensive
  `pnpm outdated -r` report unless explicitly enabled.

  Moves CI environment/repository/workspace reporting after install setup, adds an Nx report step,
  adds a combined local reporting script, and makes release PR validation manually runnable and safe
  when `GITHUB_HEAD_REF` is unavailable.

  Updates the release workflow so version-bump creation can trigger `pr-release.yml` validation on
  `release/main`.

  Also relaxes config linting defaults by allowing common short parameter names like `id`, `db`,
  `fs`, `ctx`, `req`, and `res`, and adjusts markdownlint line-length behavior for headings/tables.
  - Fixes #86
  - Fixes #87
  - Fixes #84
  - Fixes #78

## 0.0.4

### Patch Changes

- 4b74502: Fix dependency resolution and package configuration issues.
  - correct missing/incomplete dependency declarations
  - align internal package dependency configuration
  - improve CI/build reliability

## 0.0.3

### Patch Changes

- a5558d2: fixed typescript eslint error

  Fix lint-staged markdownlint behavior and markdownlint config:
  - Run `markdownlint-cli2` on staged `.md` files only (avoid repo-wide lint runs)
  - Add/repair markdownlint ignores for generated instruction docs
  - Align markdownlint code-block rules with fenced blocks

## 0.0.2

### Patch Changes

- a21a391: Monorepo polish: standardize package.json key order and repository URL, add keywords and
  publishConfig to all public packages, update buildConfig meta, add tsdown build configs for
  color/logger/node-utils, update exports via toPackageExports, update READMEs with template,
  replace rollup nx targets with tsdown, and add real unit tests for color and types.

## 0.0.1

### Patch Changes

- c815465: initial release
