---
'@snailicid3/build-config': patch
'@snailicid3/config': patch
'@snailicid3/workspace': patch
---

Fix packed-consumer release blockers found by the isolated npm and pnpm rehearsal.

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
which `require()` rejects outright with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Only declaration resolution
reached them, which is what made them report `CJSResolvesToESM` — a CommonJS consumer type-checked
cleanly and then could not load the package at all.

Workspace also declares `sideEffects: false`, and all three now declare a full git repository URL.
