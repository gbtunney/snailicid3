# @snailicid3/utils

## 0.0.5

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
- Updated dependencies [c6e5ad8]
  - @snailicid3/types@0.0.3

## 0.0.4

### Patch Changes

- 4b74502: Fix dependency resolution and package configuration issues.
  - correct missing/incomplete dependency declarations
  - align internal package dependency configuration
  - improve CI/build reliability
  - @snailicid3/types@0.0.2

## 0.0.3

### Patch Changes

- a5558d2: fixed typescript eslint error

  Fix lint-staged markdownlint behavior and markdownlint config:
  - Run `markdownlint-cli2` on staged `.md` files only (avoid repo-wide lint runs)
  - Add/repair markdownlint ignores for generated instruction docs
  - Align markdownlint code-block rules with fenced blocks
  - @snailicid3/types@0.0.2

## 0.0.2

### Patch Changes

- a21a391: Monorepo polish: standardize package.json key order and repository URL, add keywords and
  publishConfig to all public packages, update buildConfig meta, add tsdown build configs for
  color/logger/node-utils, update exports via toPackageExports, update READMEs with template,
  replace rollup nx targets with tsdown, and add real unit tests for color and types.
- Updated dependencies [a21a391]
  - @snailicid3/types@0.0.2

## 0.0.1

### Patch Changes

- c815465: initial release
- Updated dependencies [c815465]
  - @snailicid3/build-config@0.0.1
  - @snailicid3/types@0.0.1
