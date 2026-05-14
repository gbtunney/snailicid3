# @snailicid3/build-config

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
