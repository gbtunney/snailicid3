# @snailicid3/config

## 0.0.7

### Patch Changes

- 95815ae: - Improved shell logging and completion output behavior in config scripts.
  - Added commitlint support and convenience scripts.
  - Added bootstrap support for shell scripts across config/root.
  - Fixed and restored preferred shell handling, including zsh-related flow.
  - Updated dependencies across the monorepo, including build-config and config.

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
