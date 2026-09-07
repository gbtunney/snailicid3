# @snailicid3/workspace

## 0.2.0

### Minor Changes

- 0e3a070: Stabilize the release contract as the boundary an external adapter consumes.

  Five documents leave this package, and each one is a validated contract rather than a shape that
  happens to serialize: `releasePlanSchema`, `releasePreparePlanSchema`, `releaseTagPlanSchema`,
  `releasePublishPlanSchema` and `releasePublishResultSchema`. All five encode `schemaVersion: 1` as
  a literal, so `.safeParse()` rejects an unsupported document before a consumer reads a field. The
  TypeScript types are derived from those schemas, so there is no second contract to drift.

  `schemaVersion` is independent of this package's SemVer. A consumer pins a published version to
  get a known implementation and validates `schemaVersion` to know what it may read; neither
  substitutes for the other, and a version bump here does not imply a schema change.

  Alongside the read-only plan, the contract now covers prepare planning, tag planning, publish
  planning, selected publish execution, live exact `name@version` registry observation, Changesets
  release intent read through Changesets itself, and the terminal and Markdown renderers. The
  renderers project the same parsed plan rather than recomputing release state, which is what keeps
  three views from becoming three answers.

  Every one of these is reachable from the package root and is now exercised through it, so a name
  dropping out of the barrel fails a test instead of failing a consumer. Adapters are expected to
  import the public API; nothing here requires a new executable entry point.

- fbd8245: Add the canonical read-only release-plan model.

  `createReleasePlan` composes one typed document — `schemaVersion: 1`, an `observe` execution,
  per-package records and a summary — from separately supplied release intent, version state, exact
  `name@version` registry observation, publish policy, Doctor facts and Git-tag intent.
  `releasePlanSchema` is the runtime source of truth, so an adapter can reject an unsupported
  `schemaVersion` before it reads a field, and the TypeScript types are derived from it rather than
  maintained alongside it.

  The plan observes and never mutates. A missing exact registry version is inventory, not
  authorization: publication requires explicit selection. Registry lookups that fail to answer stay
  unknown rather than becoming unpublished, and `private: true` resolves to `private_unpublishable`
  whatever the registry reports, while leaving versioning and Git tagging independent.

### Patch Changes

- e3106fc: Fix packed-consumer release blockers found by the isolated npm and pnpm rehearsal.

  Config compatibility-bin shims now resolve their physical package script through the symlink a
  package manager creates in `node_modules/.bin` before delegating to the owning package.
  `dirname "$0"` resolved to `.bin` rather than to the Config script directory, so the delegating
  helper beside it could not be found under an npm install.

  Workspace, Config and Build Config declare ESM-only roots. Each was `type: module` with `main`
  pointing at an ES module, and each root offered CommonJS a route to it. None has a CommonJS
  consumer, so the routes are removed rather than reimplemented: `main` is dropped and every
  JavaScript root and subpath is a single `import` condition carrying its own declarations. Config's
  JSON asset subpaths are unchanged and stay reachable by every resolver.

  **Breaking for Build Config.** Its root carried `default` beside `import`, and `default` is in the
  condition set Node matches for `require()`. On Node >= 22.12 that route resolved and loaded, so
  `require('@snailicid3/build-config')` did work — and it is being removed here in favour of an
  explicit ESM-only contract. What is lost is worth naming precisely: this was `require(esm)`
  compatibility, not an emitted CommonJS build. There is no `.cjs` output behind it. The route
  resolved to the same ES module the `import` condition points at, threw `ERR_REQUIRE_ESM` on Node
  below 22.12, would break on any top-level await entering the graph, and packed validation reported
  it as `CJSResolvesToESM` for the root and all five adapter subpaths. Build Config is consumed from
  ESM tsdown and vitest configuration, so nothing in this repository relied on it.

  Workspace and Config lose nothing at runtime by comparison: their roots were `{ types, import }`,
  which `require()` rejects outright with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Only declaration
  resolution reached them, which is what made them report `CJSResolvesToESM` — a CommonJS consumer
  type-checked cleanly and then could not load the package at all.

  Workspace also declares `sideEffects: false`, and all three now declare a full git repository URL.

- @snailicid3/logger@0.1.0
  - @snailicid3/node-utils@0.2.0
  - @snailicid3/utils@0.1.0

## 0.1.1

### Patch Changes

- Updated dependencies [e78f39e]
  - @snailicid3/logger@0.1.0
  - @snailicid3/node-utils@0.2.0
  - @snailicid3/utils@0.1.0
