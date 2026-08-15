# @snailicid3/cli-app

## 0.2.0

### Minor Changes

- e78f39e: Finalize public package boundaries, exports, CLI ownership, and release-ready manifests.

### Patch Changes

- Updated dependencies [e78f39e]
  - @snailicid3/logger@0.1.0
  - @snailicid3/node-utils@0.2.0
  - @snailicid3/utils@0.1.0
  - @snailicid3/color@0.0.7

## 0.1.0

### Minor Changes

- f594cc6: Add typed filesystem and JSON-object schemas to CLI flags, support repeatable array
  arguments, and provide a documented, tested reference CLI. Organize CLI internals by feature and
  remove the unfinished interactive fallback in favor of deterministic Zod validation errors.

  Export typed path and filesystem schema utilities directly from node-utils, including multi-type
  and opt-in existence validation. Share single, multiple, `any`, and negated selectors between the
  core typed-path functions and Zod schemas while preserving narrowed output unions. Improve
  validation errors for missing paths, incorrect filesystem types, and unmatched globs.

  Centralize numeric range mapping, clamping, wrapping, and decimal rounding utilities in utils, and
  reuse those canonical helpers from color.

### Patch Changes

- Updated dependencies [f594cc6]
  - @snailicid3/node-utils@0.1.0
  - @snailicid3/color@0.0.6
  - @snailicid3/utils@0.0.6
  - @snailicid3/logger@0.0.6

## 0.0.9

### Patch Changes

- a3344a4: Add API Extractor config support and tighten the shared config builder API.

  - Added `ApiExtractor` config helpers, API Extractor option types, and base rule exports.
  - Standardized config tools around explicit `cwd` handling with the shared `ConfigBuilder`,
    `ConfigCwd`, and resolved options types.
  - Expanded path and JSON utilities with normalized path helpers, object/value guards, object
    import helpers, and typed JSON serialization helpers.
  - Refreshed the generated API reports for `@snailicid3/config` and `@snailicid3/cli-app`.
  - @snailicid3/build-config@0.0.8
  - @snailicid3/color@0.0.5
  - @snailicid3/logger@0.0.5
  - @snailicid3/node-utils@0.0.5
  - @snailicid3/types@0.0.3
  - @snailicid3/utils@0.0.5

## 0.0.8

### Patch Changes

- Updated dependencies [bbb57f4]
  - @snailicid3/build-config@0.0.8
  - @snailicid3/color@0.0.5
  - @snailicid3/logger@0.0.5
  - @snailicid3/node-utils@0.0.5
  - @snailicid3/types@0.0.3
  - @snailicid3/utils@0.0.5

## 0.0.7

### Patch Changes

- Updated dependencies [bbc7d8e]
  - @snailicid3/build-config@0.0.7
  - @snailicid3/color@0.0.5
  - @snailicid3/logger@0.0.5
  - @snailicid3/node-utils@0.0.5
  - @snailicid3/types@0.0.3
  - @snailicid3/utils@0.0.5

## 0.0.6

### Patch Changes

- Updated dependencies [95815ae]
  - @snailicid3/build-config@0.0.6
  - @snailicid3/color@0.0.5
  - @snailicid3/logger@0.0.5
  - @snailicid3/node-utils@0.0.5
  - @snailicid3/types@0.0.3
  - @snailicid3/utils@0.0.5

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
  - @snailicid3/build-config@0.0.5
  - @snailicid3/color@0.0.5
  - @snailicid3/logger@0.0.5
  - @snailicid3/node-utils@0.0.5
  - @snailicid3/types@0.0.3
  - @snailicid3/utils@0.0.5

## 0.0.4

### Patch Changes

- Updated dependencies [4b74502]
  - @snailicid3/build-config@0.0.4
  - @snailicid3/utils@0.0.4
  - @snailicid3/color@0.0.4
  - @snailicid3/logger@0.0.4
  - @snailicid3/node-utils@0.0.4
  - @snailicid3/types@0.0.2

## 0.0.3

### Patch Changes

- Updated dependencies [a5558d2]
  - @snailicid3/build-config@0.0.3
  - @snailicid3/utils@0.0.3
  - @snailicid3/color@0.0.3
  - @snailicid3/logger@0.0.3
  - @snailicid3/node-utils@0.0.3
  - @snailicid3/types@0.0.2

## 0.0.2

### Patch Changes

- Updated dependencies [a21a391]
  - @snailicid3/build-config@0.0.2
  - @snailicid3/color@0.0.2
  - @snailicid3/logger@0.0.2
  - @snailicid3/node-utils@0.0.2
  - @snailicid3/types@0.0.2
  - @snailicid3/utils@0.0.2

## 0.0.1

### Patch Changes

- c815465: initial release
- Updated dependencies [c815465]
  - @snailicid3/build-config@0.0.1
  - @snailicid3/color@0.0.1
  - @snailicid3/logger@0.0.1
  - @snailicid3/node-utils@0.0.1
  - @snailicid3/types@0.0.1
  - @snailicid3/utils@0.0.1
