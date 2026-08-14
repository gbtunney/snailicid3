# Plan State Audit — 2026-08-14

**Baseline:** `main` at `fa0992b` (merge of #215 `feat/storybook-config`). Working tree clean, no
`node_modules`, nothing built — all findings below are from source, manifests, and git state, not
from a build or test run.

**Purpose:** reconcile `snailicid3-architecture-and-refactor-plan.md` against what is actually in
the tree, answer the open questions raised on 2026-08-14, and register the defects found while
looking.

**Method:** read every `packages/*/package.json`, the workspace `core/` + `cli/` sources, config's
commitlint surface, doctor's collectors, cli-app's schema layer, the root scripts, and the workflow
callers. Cross-checked issue #212 (closed by #213) against the code that claims to implement it.

---

## 1. What moved since the plan was last written

| Plan claim                                                           | Actual state at `fa0992b`                                                                 | Verdict             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------- |
| Phase B2 Storybook — DONE                                            | `@snailicid3/storybook-config` merged (#215), builds config-only, depends only on config  | ✅ accurate         |
| Phase B1 build-config — deferred, untouched                          | Untouched; still owns `defineBuildPlan`/`toTsdown*`/`toVite*` and the package Zod schemas | ✅ accurate         |
| Phase 7: "TypeScript command is not yet wired to the public bin"     | **Stale.** `gbt-changeset` → `./dist/cli/changesetv2.js`; the shell workflow is gone      | ❌ plan out of date |
| Phase 7: `core/branch-state` + `branch-actions` + `cli/changeset.ts` | Landed, but `cli/changeset.ts` is now **orphaned** (see §4.1)                             | ⚠️ diverged         |
| Phase 4: "workspace declares `buildConfig.buildStrategy: bundle`"    | **Moot.** `buildConfig` is read by no code; workspace omitting it is correct (§4.6)       | ❌ plan out of date |
| Phase 2: "`scope-commit` still parses arguments manually"            | Still true — #213 refactored classification, not argv                                     | ✅ accurate         |
| §11.3: node-utils "unregistered missing root `types` condition"      | Still present, and it is worse than recorded (see §4.3)                                   | ✅ accurate         |
| §10.6 runtime tags (`runtime:node`/`browser`/`universal`)            | **Zero implementation.** No `tags` key anywhere in `nx.json` or any project               | not started         |

---

## 2. Commit scope — direct answers

### 2.1 Did #212/#213 land, and what does it actually cover?

Yes, partially, and narrower than the issue's deliverable implies.

**Landed.** `scope-commit` now resolves scopes through the shared model:

- `packages/workspace/src/core/repository-scopes.ts` — `getWorkspaceScopeClassifiers()`,
  `createRepositoryScopeClassifiers()`, `resolveRepositoryScopes()` over node-utils'
  `classifyFiles`.
- `packages/workspace/src/cli/commit.ts:311-327` is the single automatic scope-detection path.
- Match evidence is real: `formatScopeEvidence()` (`commit.ts:46-68`) prints the per-scope file
  lists and an `unmatched/root` bucket, exactly the verbose view #212 sketched.
- `--scope` is a true override (`commit.ts:93-95`), not a second architecture.

**Not landed.** The issue asked for the CLI to become "a sequence of small functional operations."
`commit.ts` is still 365 lines and still carries a 65-line hand-rolled `parseArgs` switch
(`commit.ts:154-235`) with ~10 undocumented aliases. This violates the **Phase 2 standing rule**
that any non-trivial argument parsing touched from here on uses `parseArgv`/`safeParseArgv`. #212
was closed on the classification half only.

### 2.2 Does the matcher/classifier shorten the scope keys?

**Yes — in both directions, consistently.**

- `getWorkspaceScopeClassifiers()` keys classifiers with
  `shortenScopeName(workspacePackage.name, keepPrefix)` (`repository-scopes.ts:34`), so the
  classifier map is already `config`, `logger`, … not `@snailicid3/config`.
- config's `workspaceScopes()` shortens the same way (`workspace.scopes.ts:52-56`) and maps root
  package names to `root` via `isRootPackageName`.
- `--keep-prefix` / `--full-scope` threads through both, so the long form is reachable.

The one asymmetry: `shortenScopeName` is applied **only to discovered workspace package names**.
Custom matcher keys (`DEFAULT_SCOPE_PATH_MATCHERS` plus any consumer `matchers` override) and
`mergeScopes` entries go in verbatim on both sides — `workspace.scopes.ts:38` for the enum,
`repository-scopes.ts:44` for the classifiers.

**Corrected 2026-08-14.** An earlier draft of this section claimed a hand-added namespaced key "will
fail `scope-enum`." That is wrong: because both sides use the key verbatim, a custom
`'@snailicid3/tooling': ['tools/**']` lands in the enum _and_ in the classifiers as the same string,
so the commit validates fine. The parse is fine too — the conventional header regex takes `.*` for
scope, and multi-scope splitting is on `,`, not `/`. The only cosmetic effect is that such a key
ignores `--keep-prefix` entirely, since that flag only reaches package-derived names.

The real hazard in this area is **key collision, and it is silent**:

```ts
// repository-scopes.ts:41-47 — custom classifiers win
;({ ...getWorkspaceScopeClassifiers(repoRoot, keepPrefix), ...customClassifiers })
```

A custom matcher whose key equals a _shortened package name_ **replaces that package's own
classifier outright**, so the package's files stop matching their own scope. The enum side hides it
(a `Set` dedupes the name away), so the scope stays valid and only the file→scope mapping silently
changes.

This is not hypothetical for user-added keys, and there is a latent collision with the **built-in**
defaults: a package at `packages/scripts` named `@snailicid3/scripts` would shorten to `scripts` and
be clobbered by `DEFAULT_SCOPE_PATH_MATCHERS.scripts: ['scripts/**']`. Same for `actions` and
`notes`. No current package collides, but nothing prevents one.

Fix: merge rather than overwrite (or detect and error on collision), and normalize custom keys
through `shortenScopeName` on the way in so the two sources are in one namespace.

### 2.3 Is commitlint using the new #212 functions?

**No — commitlint is still on the _old_ matcher system.** This is the most important structural
finding in the commit-scope area. There are two parallel scope engines in `workspace/core`, both
exported from the public barrel:

| Engine              | File                   | Mechanism                              | Consumers                                                   |
| ------------------- | ---------------------- | -------------------------------------- | ----------------------------------------------------------- |
| **New** (#211/#212) | `repository-scopes.ts` | node-utils `classifyFiles` classifiers | `scope-commit` only                                         |
| **Old**             | `scope-matchers.ts`    | direct `micromatch.isMatch` per path   | `scope-affected`, config commitlint, `scope-matcher-config` |

Specifically:

- `config/src/commitlint/api-functions.ts:51` computes the `scope-enum` and the stored
  `snailicid3.scopeMatchers` settings via `resolveScopePathMatchers()` — the old map.
- `config/src/commitlint/workspace.scopes.ts:38` enumerates scope names from the same old map.
- `workspace/src/cli/affected.ts:129` matches paths with `matchScopesForPath()` — the old matcher.
- `core/scope-matcher-config.ts` (cosmiconfig round-trip) reads/writes the old shape.

So `scope-commit` classifies files with one algorithm, `scope-affected` with another, and commitlint
validates against an enum built from the second. They agree today because the built-in matcher set
is tiny and package classifiers are generated identically — but nothing enforces that, and there is
no test asserting the two engines produce the same scope for the same file.

**This is the #212 deliverable line "old scope/Commitlint code that appears removable in a later
cleanup," never written down.** Registering it here.

### 2.4 The changeset script

`cli/changesetv2.ts` (214 lines) is what the user describes: a straight port of
`changeset-branch.sh` to Node on `safeParseArgv` + a Zod `optionsSchema`
(`allowDirty`/`base`/`prefix`), using `@snailicid3/logger` for output (`kabob`, `kvPair`, `line`,
`section`, `spacer`). It shells out to `scope-affected --changeset-only` for scope and
`scope-commit --checked-commit` for the commit. The old `changeset-branch.sh` is deleted.
`gbt-changeset` points at it. This is a faithful, working conversion.

It is also **flat-denial logic** — the exact behavior Phase 7.2 exists to replace:

- `changesetv2.ts:110-112` — dies if not on base
- `changesetv2.ts:121-125` — dies on dirty tree unless `ALLOW_DIRTY`
- `changesetv2.ts:141-145` — dies if base is not up to date
- `changesetv2.ts:179-192` — dies if the target branch exists locally or on origin

Meanwhile the state machine that replaces all four of those (`decideBranchAction` → create / switch
/ relink / proceed / block) is fully implemented, unit-tested, and **wired to nothing** (§4.1).

So the current state is: the state-machine work is done and unused; the bin runs the ported shell
logic. That is a defensible holding position, but it should be recorded as such rather than read as
"Phase 7.2 is in progress."

**Effect on changesets:** none of the plan's changeset assumptions break, but Phase 7.3's "base flow
is side-effect free (create branch, run `changeset add`, stop — no commit/push)" is contradicted by
the shipped bin, which commits. When 7.2/7.3 land, `gbt-changeset`'s default behavior changes from
"commits" to "stops before commit." That is a **behavior break on a maintainer-facing bin** and
needs a deliberate call, not a silent flip.

### 2.5 Commitlint header-max-length

Confirmed at `packages/config/src/commitlint/base.ts` — `'header-max-length': [2, 'always', 150]`.

The failing header was 159 chars, of which the 12-package scope list is ~115. Raising the number
alone only defers this; every new package adds ~10 chars and there is no ceiling.

Recommendation, in order:

1. **Collapse rule in `formatScopes`/`scope-commit`:** when resolved scopes exceed _N_ (or the
   rendered header would exceed the limit), collapse to a single umbrella scope. `root` already
   means "everything" in this taxonomy and is already in `BASE_COMMITLINT_SCOPES`, so it is the
   natural collapse target. Make _N_ configurable through the existing commitlint options.
2. **Then** raise `header-max-length` to something that comfortably fits the collapsed form
   (e.g. 100) rather than the uncollapsed one.

The collapse belongs in workspace (scope presentation), not in config (policy) — config only
supplies the limit the collapse targets.

---

## 3. Duplicate `snail-sh` shell surface

Phase 3 says: "Keep only the **minimal** shell fallback needed before compiled JavaScript is
available during bootstrap." What is actually in the tree:

| File                                        | Lines | Status                                                          |
| ------------------------------------------- | ----- | --------------------------------------------------------------- |
| `packages/logger/src/cli/snail-sh.ts`       | —     | ✅ the real owner (compiled dispatcher)                         |
| `packages/config/bin/workspace/snail-sh.sh` | 2     | ✅ correct — a 2-line `exec` delegate to the logger package     |
| `packages/workspace/bin/bootstrap.sh`       | 153   | ⚠️ genuine bootstrap floor, but hard-requires the 796-line file |
| `packages/workspace/bin/snail-sh-logger.sh` | 796   | ❌ full second implementation of the logger, in bash            |
| `packages/workspace/bin/snail-sh-test.sh`   | 298   | ❌ scratch/demo file, shipped                                   |

`snail-sh-logger.sh` is a complete parallel logger — colour constants, style helpers, rules, and the
higher-level logging functions — i.e. the thing Phase 3 was supposed to collapse. `bootstrap.sh`
locates the package root _by looking for it_ (`bootstrap.sh:20`), so it cannot currently be trimmed
without reworking that probe. `snail-sh-test.sh` still contains `#TODO`/`echo ${RED}----` scratch
lines and is reachable as `packages/config` script `demo:logger`.

Both are inside workspace's published `files` array (`bin/**/*.sh`).

**Action:** reduce `snail-sh-logger.sh` to the handful of functions `bootstrap.sh` + the four `.sh`
bins actually call before Node exists, and either delete `snail-sh-test.sh` or move it out of
`bin/`and out of `files`.

---

## 4. Defects found during the audit

These are not plan items; they are things that are wrong right now.

### 4.1 `packages/workspace/src/cli/changeset.ts` is dead code (164 lines)

No bin, no test, no barrel export, no reference anywhere in the repo. It is the Phase 7.2 read-only
plan/`--apply` command, orphaned when `changesetv2.ts` took the `gbt-changeset` bin. The core it
drives (`branch-state.ts`, `branch-actions.ts`, `branch-commit.ts` — 416 lines with tests) is
reachable only through the barrel.

Decide: promote it (give it a bin or a `gbt-changeset plan` subcommand), or delete it and keep the
tested core for when 7.2 resumes. Do not leave it as an unreferenced file that reads like shipped
behavior.

### 4.2 `@snailicid3/doctor` export target is a typo

`packages/doctor/package.json:87` — `"import": "./dist/indklex.js"` (should be `index.js`).

Doctor's own `EXPORT_TARGET_MISSING` collector (`manifest.ts:213`) would catch this the moment
anything is built, which makes the plan's B3 verification line — "Doctor reports zero findings
against its own built package" — no longer true. One-character fix; the interesting part is that it
survived, which is evidence for the "run doctor on the whole workspace in CI" item.

### 4.3 Export-map defects across public packages

Audited all 12 manifests against their `tsdown.config.ts` output formats:

| Package                        | Emits        | Declares                                 | Problem                                                         |
| ------------------------------ | ------------ | ---------------------------------------- | --------------------------------------------------------------- |
| `@snailicid3/node-utils`       | esm, cjs, ts | `{"import": "./dist/index.mjs"}` only    | **CJS is emitted and unreachable; no `types` condition either** |
| `@snailicid3/cli-app`          | esm, ts      | `"." : "./dist/index.mjs"` (bare string) | no `types` condition                                            |
| `@snailicid3/build-config`     | none         | `types`, `import`, `default`             | no `require` (fine — nothing emitted)                           |
| `@snailicid3/config`           | none         | `{"import": …, "types": …}`              | **`types` listed after `import`** — condition order             |
| `@snailicid3/workspace`        | tsc          | `{"import": …, "types": …}`              | **`types` listed after `import`** — condition order             |
| `@snailicid3/storybook-config` | esm, cjs, ts | `import` + `require`                     | ok                                                              |

Two distinct classes here, both matching what was asked about:

- **node-utils is the concrete case of "emits CJS, `require` not in exports."** It is public at
  `0.1.0`. A CommonJS consumer of `@snailicid3/node-utils` cannot resolve it at all, and the built
  `.cjs` ships as dead weight.
- **`types` after `import` in config and workspace.** Export conditions are order-sensitive and
  first-match-wins; `types` must precede `import`/`require` or a TypeScript resolver can miss it.
  build-config gets this right, which shows the ordering is incidental rather than deliberate.

Neither class is currently detectable by doctor: `analyzeExportTargets` checks that declared targets
_exist_, never that emitted formats are _reachable_ or that conditions are _ordered_.

### 4.4 `@snailicid3/storybook-config` — private/public inconsistency

`private: true` **and** `publishConfig.access: "public"`, at version `0.0.0`. Exactly the class of
inconsistency worth reporting on. It is harmless (private wins) but it is a mixed signal about
release intent — and per #206's concern, the eventual `private: false` flip must not silently select
a release-candidate phase.

Full privacy matrix:

- public: build-config `0.0.8`, cli-app `0.1.0`, color `0.0.6`, config `0.2.0`, logger `0.0.6`,
  node-utils `0.1.0`, types `0.0.3`, utils `0.0.6`
- private: doctor `0.0.0`, example-package `0.0.0` (fixture), storybook-config `0.0.0` ⚠️, workspace
  `0.0.0`

### 4.5 Root `inspect:deps` script is broken

`package.json:38` — `"inspect:deps": "pnpm inspect:dependencies"`. The `inspect:dependencies` script
was removed with the `inspect-dependencies` bin in Phase 5; nothing defines it. The alias now fails.

### 4.6 `buildConfig` is dead metadata — delete it, don't complete it

> **Corrected 2026-08-14 (this section and §4.9 both).** The original write-up treated inconsistent
> `buildConfig` as build-contract drift to be reconciled. That was wrong, and it inverted the fix.

**Nothing reads the manifest `buildConfig` key.** It is declared on nine manifests (types, doctor,
build-config, storybook-config, config, utils, example-package, color, `apps/playground`) and
referenced by zero lines of code. Verified by searching all `.ts`/`.mts`/`.json` outside
`node_modules`: the only hits are the declarations themselves.

The live mechanism is elsewhere:

- `defineBuildPlan(pkg, options)` parses the manifest through `schemaBasePackage`, which picks only
  `author`, `description`, `license`, `name`, `private`, `repository`, `type`, `version`. The
  `buildConfig` key is never accessed.
- `runtime` and `product` are supplied **inline, per entry**, in each `tsdown.config.ts` — e.g.
  logger's root entry carries `product: 'library', runtime: 'universal'`. The plan schema defaults
  them to `library`/`universal` when omitted.
- `buildStrategy` does not exist in the plan schema at all. It is the Doctor classification from
  §10.2 (`'bundle' | 'transpile' | 'none'`), which §10.6 says to **infer from resolved configuration
  and artifacts**, not to read from a declaration.

So the correct action is **deleting the stale key from all nine manifests**, not adding it to the
four that omit it. This matches §10.6 directly: _"Infer product from bins, exports, targets, and
configs when reliable. Infer BuildStrategy from resolved configuration and artifacts. Use custom
project or target metadata only as an override for genuinely ambiguous intent."_ Explicit
declaration is the escape hatch for something genuinely underivable — reintroduce it deliberately,
with a reader, if Doctor ever finds such a case.

Stale values are worse than absence: the wrong ones are actively misleading, which is how this audit
originally filed two defects against them.

Knock-on corrections:

- The Phase 4 item "reconcile workspace's `buildStrategy: bundle` with its tsc-only build" is
  **moot**, not restated. Workspace omitting the key is the correct end state.
- `RUNTIME-LOGGER-001`'s "declared runtime intent" is logger's `tsdown.config.ts` entry
  (`runtime: 'universal'`), not a manifest field — so that fixture is unaffected and its retirement
  gate ("compare declared runtime intent with the emitted dependency graph") still reads correctly.
- Open decision 14 narrows: it was never `buildConfig` vs Nx tag. See §4.9.

### 4.6b Superseded — original `buildConfig` coverage note

_Kept only as a record of what the audit first claimed._ The original text reported the key as
declared on 6 of 12 packages and "missing on cli-app, logger, node-utils, workspace — three of the
four release-cohort packages," and treated that absence as build-contract drift. Since nothing reads
the key, the absence was correct and the declarations were the anomaly. Superseded by §4.6.

### 4.7 config's workspace edge is load-bearing for policy — and unpublishable

**This is the most significant misalignment found.** Plan §3.1 permits config to declare workspace
and logger as dependencies _"solely so its published compatibility wrappers can delegate to their
new owners. **No config policy API may use that edge.** Remove the temporary dependency when the
compatibility window ends."_

Both halves of that rule are now broken:

1. **Policy APIs use the edge.** `config/src/commitlint/api-functions.ts:3-6` imports
   `resolveScopePathMatchers` and `SNAILICID3_COMMITLINT_CONFIG_KEY` from `@snailicid3/workspace`,
   and `config/src/commitlint/workspace.scopes.ts:1-9` imports six more (`formatScopes`,
   `getWorkspacePackagesList`, `isRootPackageName`, `resolveScopePathMatchers`, `shortenScopeName`,
   `uniqueSorted`). These are the commitlint config factory — policy, not a bin wrapper. The edge is
   what makes `Commitlint.config()` work at all, so it can never be "removed when the compatibility
   window ends" as written.
2. **The edge is public.** `config/src/index.ts:210-230` re-exports ~15 workspace symbols from
   config's own public barrel: `runPackageBinary`, `runPackageManager`, `runPackageScript`,
   `loadScopePathMatchers`, `DEFAULT_SCOPE_PATH_MATCHERS`, `matchScopesForPath`,
   `resolveScopePathMatchers`, `scopeMatchersFromCommitlintConfig`, plus six types.

And `@snailicid3/workspace` is `private: true` at `0.0.0`. So:

- **`@snailicid3/config@0.2.0` cannot be published today, at all.** Its tarball would carry a
  registry dependency on a package that has never been published — rule 2.7's explicit prohibition.
  §11.3 frames this as "prove from a clean install during rehearsal"; it is actually a hard
  structural gate that no amount of rehearsal fixes until workspace is published or the edge is cut.
- **The §5.1 scope-engine cleanup just got more expensive.** Because config re-exports
  `matchScopesForPath` / `resolveScopePathMatchers` / `scopeMatchersFromCommitlintConfig` /
  `DEFAULT_SCOPE_PATH_MATCHERS` from its _public_ barrel, deleting the old engine is a **breaking
  change to `@snailicid3/config`'s published API**, not an internal tidy-up. That needs a
  deprecation window, or the re-exports need to be withdrawn first as a separate versioned step.

Decide which: publish workspace (opening the Phase 4 release gate early), or invert the dependency
so config's commitlint factory receives resolved scopes from the caller instead of importing them
(§5's "the root or consumer configuration composes the two public APIs" — which is what §4 of the
plan already prescribes and the code does not do).

### 4.8 node-utils' path duplication now blocks the doctor exports work

Plan §6 recorded this as a residual follow-up: _"`node-utils/file.path.array.ts` has its own naive
`getFullPath` (string concat) wired into the `zod.node.ts` fs schemas; unifying it with the robust
`path.ts` version is semantics-sensitive and deferred."_

Still true, and it is no longer independent. `zod.node.ts:4-12` imports `getFullPath`,
`doesFileExist`, and `normalizePath` from **`file.path.array.js`** — the naive implementations:

```ts
// file.path.array.ts:159 — naive
export const getFullPath = (_value, _root) => (_root !== undefined ? `${_root}/${_value}` : _value)

// path.ts:59 — robust
export const getFullPath = (value, root) =>
  nodePath.isAbsolute(value)
    ? normalizePath(value)
    : normalizePath(nodePath.join(resolveCwd(root), value))
```

The naive one ignores absolute inputs (`getFullPath('/abs/x', '/root')` → `/root//abs/x`), never
normalizes, and emits double slashes.

**Why it matters now:** the plan for doctor's package-exports validation is to build on node-utils'
file-exists Zod schema. That schema is backed by the wrong resolver. Any exports collector resolving
`./dist/index.js` against a package root through `zod.node.ts` inherits the mangling. This moves
from "deferred cleanup" to **prerequisite for the doctor exports collectors**.

### 4.9 The runtime-tag question, narrowed

> **Corrected 2026-08-14.** This section originally read "`buildConfig` is not just missing, it is
> wrong where present," citing config and build-config declaring `"buildStrategy": "none"` while
> emitting JS. The observation is accurate but the framing was not: since nothing reads the key
> (§4.6), those values are not _wrong declarations_, they are **inert noise**. Both are deleted by
> §4.6's fix rather than corrected.

What survives is a narrower, genuine question. Nx `runtime:node` / `runtime:browser` /
`runtime:universal` tags (§10.6) are for **dependency-boundary enforcement** — Nx module-boundary
rules can only read tags, not tsdown entry options. There are currently **zero** tags anywhere.

Meanwhile the live `runtime` declaration lives per-entry in each `tsdown.config.ts`, where Nx cannot
see it. So the decision is:

1. **Derive Nx tags from the tsdown plan** so boundary rules can be enforced — accepting that the
   fact is then recorded twice, which §10.6 forbids unless one side is generated from the other.
2. **Skip tag enforcement** and let Doctor observe the emitted dependency graph instead — which is
   what §10.6 prefers ("infer... when reliable") and what `RUNTIME-LOGGER-001`'s retirement gate
   already describes.

Note these are not equivalent: (1) _prevents_ a browser package importing `node:util` at build time;
(2) only _reports_ it afterwards. That trade-off, not the metadata location, is the actual decision.

### 4.10 More unreachable emitted artifacts

§4.3 found node-utils emitting CJS with no `require` condition. The same class appears with a
different format:

- **`@snailicid3/utils`** builds a second entry with `runtime: 'browser'`,
  `include_dependencies: true`, `output_formats: ['iife']` — and its exports map declares only
  `import`/`require`. The browser bundle (with dependencies inlined, so not small) is published and
  unreachable by package name.
- `@snailicid3/example-package` also emits `iife` unreferenced, but that is the fixture and is
  covered by `EXP-EXAMPLE-001`.

So the collector proposed in §6 should be "every emitted format has a reachable export condition,"
not specifically a CJS check.

### 4.11 Stale and unintended manifest entries

- **`@snailicid3/logger`** declares `files: ["CHANGELOG.md", "bin", "dist", "types"]` but has **no
  `bin/` directory**. Leftover from the `snail-sh` ownership move; harmless, but it is the kind of
  thing a packed-contents check exists to catch.
- **`@snailicid3/cli-app`** declares a public bin `cli-app-example` → `./dist/example.mjs`. A public
  package is shipping its own example as a bin contract. It is not in the §6.1 destination map and
  appears in no plan discussion — i.e. nobody decided this. Either drop it or register it.

### 4.12 A TODO that contradicts the plan, and one that is a wishlist item already half-built

- **`config/src/build-exporter.ts:6`** —
  `TODO: ... this is TEMPORARY till the configs are correct. ideally this should be gotten rid of`.
  Plan §6 explicitly **corrected** this belief: the exporter's generated `dist/*.json` files are
  public exports (`./prettier`, `./markdownlint`, `./nx-preset.json`, `./api-extractor/base.json`)
  and both `packages/types` and `packages/build-config` `extends` the generated api-extractor base.
  Anyone acting on the in-file comment breaks consumers. Update the comment to point at the plan's
  correction.
- **`config/src/prettier/options.ts:79`** — a commented-out
  `packageSortOrder: ["name", "version", "private", "description", "scripts", "main", …]`. **This is
  the package-key-reordering feature on the wishlist, already half-written and disabled.** Whatever
  the README/manifest normalizer skill ends up doing, it should start from this list rather than
  inventing a new ordering.

### 4.14 `getGitChangedFiles` destroys file provenance

`core/git.ts:62-102` runs up to four separate git commands (`diff --cached`, `diff`,
`ls-files --others`, and optionally a `base...head` range) and merges every result into a single
deduped `Set<string>`:

```ts
const files = new Set<string>()
const add = (args) => {
  for (const file of splitNonEmptyLines(output.stdout)) files.add(file)
}
```

The caller receives a flat `Array<string>` with no record of which area each file came from.
Consequences:

- **A staged/unstaged/untracked bucket report is not currently implementable** — the data is gone
  before `scope-commit` sees it. `resolveInputFiles()` only records a single whole-run label
  (`'staged' | 'all' | 'explicit'`).
- **The most useful case is invisible.** A file that is staged _and_ has further unstaged edits is
  extremely common and appears exactly once, indistinguishable from a fully-staged file. That is
  precisely the state a commit-time report should warn about, since the unstaged half will not be
  committed.

Fix: return provenance (per-file areas, or a `Record<area, string[]>`) and keep the flat array as a
thin wrapper — `getChangedWorkspacePackagesFromGit` and `resolveInputFiles` are the only two
callers.

**Related silent-failure bug in the same function:** `add()` calls `runCommand('git', args)` with
**no `cwd`**, unlike every other git call in this package which passes `{ cwd: repoRoot }`. On
failure it early-returns (`if (!output.success) return`) without surfacing anything. Combined with
`getRepoRoot({ fallbackToCwd: true })` in `cli/commit.ts:74`, running `scope-commit` outside a git
repository yields: repoRoot = cwd → every git command fails silently → `files = []` →
`resolveScopesForFiles` short-circuits to `['root']` → a clean, confident `chore(root): …` with no
warning that nothing was inspected. Thread `repoRoot` through and report a failed git invocation.

### 4.15 Verbose evidence and machine-readable output share stdout

`cli/commit.ts:100` writes the scope evidence with `console.log`, then `:119` writes the parseable
scope value with `console.log`. Both go to stdout, so `scope-commit --csv --verbose` emits the human
report and the csv on the same stream and anything capturing the value gets both.

This matters because capturing stdout from these bins is an established pattern —
`cli/changesetv2.ts:164` does exactly that against `scope-affected` and uses the result as the
commit scope. Send the report to stderr (or make it a distinct subcommand) before making it richer,
or the prettier it gets the more it breaks.

### 4.16 Two zod→yargs bridges

`packages/node-utils/src/argv.ts` (`parseArgv`/`safeParseArgv`, yargs + Zod) and
`packages/cli-app/src/schema/to-yargs.ts` + `app/init.ts` (its own yargs instance, its own zod→yargs
option converter). Both depend on `yargs` directly. cli-app predates the argv primitive and was
never repointed.

Related: `cli-app/src/app/config.ts:52` carries `//TODO make into zod schema` on its
package-manifest handling — the same package-schema question as §6's ownership decision, from a
third location.

---

## 5. Corrections to apply to the plan document

1. **Phase 7 progress paragraph** — remove "This TypeScript command is not yet wired to the public
   `gbt-changeset` bin, which still runs the compatibility shell workflow." Replace with: the bin
   now runs `changesetv2.ts`, a direct Node port of the shell workflow retaining flat denial; the
   `decideBranchAction` state machine is implemented and unwired.
2. **Phase 4, item 5** — close as moot. The manifest `buildConfig` key is read by no code, so the
   recorded `bundle`-vs-tsc mismatch is inert; the follow-up is deleting the key from the nine
   manifests that still carry it, not adding it to the four that omit it (§4.6).
3. **Phase 2, remaining item** — `scope-commit`'s classification half is done (#213); only the argv
   migration remains. `scope-affected` is untouched on both halves.
4. **§10.3 / B3 verification** — "Doctor reports zero findings against its own built package" is
   invalidated by §4.2.
5. **§11.3 node-utils row** — the missing root `types` condition is accompanied by a missing
   `require` condition for emitted CJS. Both are unregistered drift, not fixtures.
6. **New Part A item** — the dual scope engine (§2.3). #212 explicitly asked for the removable old
   code to be summarized; it was not.
7. **§3.1's temporary-edge rule is already violated** — config's commitlint policy imports from
   workspace, and config re-exports ~15 workspace symbols publicly (§4.7). The rule as written ("no
   config policy API may use that edge; remove it when the window ends") no longer describes
   something achievable without a design change. Restate it as a decision, not a constraint.
8. **§6 residual path-helper follow-up** is now a doctor prerequisite rather than a deferred tidy-up
   (§4.8).

---

## 6. Backlog

Ordered within each group by whether it unblocks something else.

### Commit scope / changesets

- [ ] Register and resolve the dual scope engine: repoint `scope-affected` and config's commitlint
      scope-enum at `resolveRepositoryScopes`, then delete `matchScopesForPath`. Add a test
      asserting both surfaces agree on the same file set.
- [ ] Scope-count collapse rule + raise `header-max-length` (§2.5).
- [ ] Migrate `scope-commit` argv to `safeParseArgv` (Phase 2 standing rule); audit the ~10 aliases
      in the switch and drop the redundant ones in the same pass.
- [ ] Same for `scope-affected` and `workspace-hook`.
- [ ] Decide `cli/changeset.ts`: promote or delete (§4.1).
- [ ] Decide whether `gbt-changeset`'s default stops committing when 7.2/7.3 land — behavior break,
      needs an explicit call.
- [ ] Normalize custom matcher keys through `shortenScopeName` (§2.2).
- [ ] **Commit-scope report — local `scope-commit` output showing changed/staged files bucketed by
      resolved scope.** Corrected 2026-08-14 after clarification: this is terminal output from the
      local bin, **not** related to the CI repo report in the actions repo. Nothing here needs that
      repo attached. Detail in "Commit-scope report — design notes" below.
- [ ] PR auto-labeling from scopes/types: `notes/LABEL_TAXONOMY.md` already defines `type:*` and
      `scope:*` and marks `changeset`/`release` as tool-generated. The vocabulary is ready; the
      trigger is not. Blocked behind the same actions-repo attach.

### Config / workspace

- [ ] **Resolve the config→workspace edge (§4.7).** Blocks any config release and raises the cost of
      the §5.1 cleanup. Two routes: publish workspace (opens the Phase 4 gate early), or invert the
      dependency so the commitlint factory _receives_ resolved scopes from the caller — which is
      what plan §4 already prescribes ("the root or consumer configuration composes the two public
      APIs") and the code does not do. Withdrawing config's public re-exports of the workspace scope
      symbols is a separate versioned step that should come first either way.
- [ ] Unify `getFullPath`/`normalizePath`/`doesFileExist` in node-utils and repoint `zod.node.ts`
      off `file.path.array.js` (§4.8). **Prerequisite for the doctor exports collectors**, not an
      independent cleanup.
- [ ] Remove `snail-sh-logger.sh` down to the bootstrap floor; delete or relocate `snail-sh-test.sh`
      (§3), and drop `config`'s `demo:logger` script that points at it.
- [ ] Fix `inspect:deps` (§4.5).
- [ ] Drop logger's stale `"bin"` entry from `files`; decide on cli-app's `cli-app-example` bin
      (§4.11).
- [ ] Correct the `build-exporter.ts` TODO so it stops contradicting plan §6 (§4.12).

### Doctor

Everything here is a _collector_, and the ordering matters — the manifest layer is hand-rolled JSON
walking today (`manifest.ts`), while a Zod package schema already exists in **build-config**
(`src/build/schemas/package.ts` — `schemaBasePackage`, `parsePackage`, required-scripts schema).
Those two should not both exist. Note B1 wants build-config deleted into config, and §B1 already
says the export-plan helper belongs to **doctor** — so the package schema's destination needs the
same call.

- [ ] Fix the `indklex.js` typo (§4.2) and run doctor over the whole workspace in CI so it cannot
      regress.
- [ ] Decide the owner of the package Zod schema (doctor vs config), then have doctor validate
      manifests through it instead of `isJsonRecord` walking.
- [ ] **Emitted-format vs declared-condition collector** — generalize past CJS to _every_ emitted
      format having a reachable export condition. Needs the build plan's `output_formats`
      (build-config today) compared against the exports map. Catches §4.3 node-utils (CJS) and §4.10
      utils (browser `iife`). This is the same collector Phase B3 lists as "compare build-plan
      expectations with emitted and packed entry points," which also completes `EXP-EXAMPLE-001`.
      **Depends on §4.8** — it resolves target paths through node-utils' fs schemas.
- [ ] **`buildStrategy` accuracy collector** — derive the observed strategy from resolved targets
      and compare against the declared `buildConfig`. Catches §4.9 (config and build-config both
      claim `none` while emitting JS) and the §4.6 absences. §10.2 already specifies deriving it;
      nothing currently compares.
- [ ] **Condition-order collector** — `types` must precede `import`/`require`. Catches §4.3
      config/workspace.
- [ ] **Multiple entry points:** already handled for _existence_ — `collectDeclaredExportTargets`
      walks all subpath keys and nested conditions (`manifest.ts:105-124`), verified against
      example-package's `.` + `./node`. The two collectors above must iterate the same way rather
      than only checking the root.
- [ ] **Private/public consistency collector** — `private` vs `publishConfig.access` vs version
      `0.0.0`. Catches §4.4. Ties directly to #206's "a `private:false` flip must not silently
      select the release-candidate phase."
- [ ] **Bin audit beyond existence.** Doctor already checks bin targets exist and are executable
      (`manifest.ts:126-179`). What is missing is liveness: cycle each bin's `--help` and report the
      screen, so abandoned/broken bins surface and the output can be diffed into the README. Note
      four of workspace's eight bins are `.sh` files, so the runner cannot assume Node.
- [ ] **Exports drop-in code block** in the CLI output — emit the correct exports map as a
      paste-able block rather than auto-mutating `package.json`. Auto-mutation is barred by rule 2.4
      and §8.3; a printed block is not. `cli-highlight` would be the syntax-highlighting option, but
      the cheaper route is logger's existing terminal helpers — evaluate before adding a dependency.
- [ ] Should doctor consume cli-app? Not yet. cli-app currently has its own yargs stack (§4.16) and
      no prompt layer, so adopting it would import the duplication rather than resolve it. Sequence:
      repoint cli-app onto node-utils' argv primitives → add the prompt/table layer → _then_ make
      doctor a consumer. Doing it in that order means doctor gains flags + UI at once instead of
      inheriting a second parser.

### cli-app

- [ ] Repoint `app/init.ts` + `schema/to-yargs.ts` onto node-utils `parseArgv`/`safeParseArgv`;
      delete the duplicate bridge (§4.16). Prerequisite for everything else in this group.
- [ ] Add `@snailicid3/logger` table rendering to the cli-app surface. Logger already owns
      `table.ts`/`terminal.ts` and the plan already requires `cli-table3` to live there so workspace
      and doctor can render tables _without_ depending on cli-app — so this is cli-app consuming
      logger, not logger moving.
- [ ] Add the prompt layer (inquirer or equivalent — **nothing of the kind is in the tree today**,
      no `inquirer`/`prompts`/`@clack` in any manifest). Target: fill in required args and missing
      flags interactively, with the file-path picker as the first useful widget. This is the "UI
      mapping for required args" idea; the Zod schema is already the source of truth for what is
      required, so the mapping is schema → prompt, not a new declaration.
- [ ] Then: doctor as a cli-app consumer (see above).

### Build / auxiliary builds / tags

- [ ] Delete the dead `buildConfig` key from all nine manifests that still declare it (§4.6).
- [ ] Introduce `runtime:node` / `runtime:browser` / `runtime:universal` Nx tags — currently zero
      tags exist anywhere. §10.6's rule is that tags are used _when dependency rules can enforce
      them_, and that the same fact must not be recorded in both tags and metadata, so decide up
      front whether Nx tags are generated from the per-entry tsdown `runtime`, or whether tag
      enforcement is skipped in favour of Doctor observing the emitted graph (§4.9).
- [ ] Auxiliary builds: §10.5 already defines the category (Storybook static, docs, demo) and states
      an auxiliary target is not residual merely because canonical build does not depend on it. The
      open work is doctor's auxiliary-build discovery collector (§10.4), not a new concept.

### Reporting / DX futures

Grouped because they share one mechanism: a per-package status collector with a renderer. Worth
building the collector once rather than as seven scripts.

- [ ] Per-package `check` / `fix` / `md:fix` / api-extractor / coverage runner, driven from the same
      package list.
- [ ] Prepackage-adjacent enumeration: docs generated? Storybook? Chromatic? API report? — this is
      §10.5's target-category classification, so it should read resolved Nx targets, not guess.
- [ ] `pnpm outdated` with a pin list — a way to freeze specific versions (lint-staged, typescript)
      out of the report and update everything else. No such pin mechanism exists today.
- [ ] Env variable reporting. `workspaceEnvironment`/`defineEnv` already declares the full set
      (`ALLOW_DIRTY`, `BASE_BRANCH`, `COMMAND_NAME`, `LOGGING`, `PACKAGE_MANAGER`, `GBT_PATCH_CWD`,
      `PREFIX`, `PREFIX_OVERRIDE`, `PROTECTED_BRANCHES`, `SCOPE_COMMIT_SKIP_COMMITLINT`,
      `SKIP_LINT_STAGED`) — the report is a renderer over `keys`, not new declaration work.
- [ ] `.gitignore` diff against the standard — flagged as an AI-confusion source.
- [ ] Published-versions list (registry vs manifest). §11.3 already maintains this by hand for the
      four-package cohort; automating it retires that manual table.
- [ ] README skill: reordering package keys, keywords, and standard sections. **Skill is the right
      shape precisely because it mutates** — rule 2.4 keeps mutation out of config, and doctor is
      read-only by rule 2.5, so a mutating README/manifest normalizer has no home in either package.
      There is no `.claude/` directory in this repo yet. **Start from the existing ordering:**
      `config/src/prettier/options.ts:79` already carries a commented-out `packageSortOrder`
      (`name`, `version`, `private`, `description`, `scripts`, `main`, …) — the key order is already
      decided, just disabled (§4.12).
- [ ] Pretty logging for doctor output specifically (distinct from the commit-scope report) — logger
      already owns `table.ts`, `terminal.ts`, `spinner.ts`, and the
      `kabob`/`kvPair`/`section`/`line` helpers that `changesetv2.ts` uses, so this is renderer
      wiring, not new logger work.

---

#### Commit-scope report — design notes

Half of it already ships. `formatScopeEvidence()` (`cli/commit.ts:46-68`) prints file count, each
scope with its matched files indented beneath, an `unmatched/root` bucket, and the final csv scope
line — behind `--verbose`/`--debug`. What is missing, in dependency order:

1. **Git provenance (the enabling change, §4.14).** `getGitChangedFiles` flattens staged, unstaged,
   and untracked into one deduped `Set<string>`, so _there is currently no way to bucket by area_ —
   the information is destroyed before the CLI sees it. Return per-file areas (or a
   `Record<area, string[]>`), keeping the flat array as a thin wrapper for the two existing callers.
   Until this lands, the report can only show one undifferentiated list.
2. **Cross-tabulate area × scope.** The scope axis already exists in
   `RepositoryScopeResolution.matches`/`.unmatched`; the area axis comes from (1).
3. **Render with logger instead of `console.log`.** `table.ts`, `kabob`, `kvPair`, `section`,
   `line`, and `spacer` are already used exactly this way by `cli/changesetv2.ts`.
4. **Fix the `--scope` blind spot.** `explicitScopeResolution()` (`commit.ts:136-144`) returns
   `matches: {}`, so an explicit scope produces an _empty_ report. It should still classify for
   display and show the override alongside — surfacing "you passed `config`, but staged files also
   touch `logger`" is the most useful thing this report can say.
5. **Move it off stdout (§4.15).** It currently interleaves with the machine-readable scope value on
   the same stream.

**Direction settled 2026-08-14: build it locally first, let CI consume it later.** This is the same
arrangement as plan §7.1's shared release engine ("`gbt-changeset plan` and the CI summary call the
same function") and the same as `scope-affected`, which CI already consumes today. It changes three
things about how the above is built:

- **The report model belongs in workspace `core/`, not `cli/`.** `formatScopeEvidence()` currently
  lives in `cli/commit.ts`, but #212's own boundary table puts "orchestration and presentation only"
  in the CLI. The buckets, counts, and area×scope cross-tab are repository knowledge; only the
  terminal rendering is CLI. Putting the model in core is what makes a second consumer possible
  without the CLI becoming a dependency of CI.
- **Machine output is a day-one requirement, not a retrofit.** §7.1 already requires the release
  plan report "in both human- and machine-readable form, with tests" — hold this report to the same
  bar. That also makes §4.15 non-negotiable rather than cosmetic: JSON on stdout, human report on
  stderr, so a CI step can capture one while a human reads the other.
- **Expect three renderers, not one.** Terminal (logger), JSON (CI capture), and **markdown** — a
  job summary written to `$GITHUB_STEP_SUMMARY` is what makes this "cute" in a PR, and retrofitting
  markdown onto a renderer designed only for ANSI is the usual way this goes wrong. Design the
  renderer set up front; implement terminal first.

This also strengthens the case for doing §4.14 properly: with two consumers, per-file provenance
stops being a nicety for one verbose flag and becomes the report's actual data model.

## 6b. Wishlist coverage index

Every item raised on 2026-08-14, and where it now lives. Nothing from that list was dropped.

| Raised                                                         | Tracked at             | State when audited                                                  |
| -------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| #212 commit-scope direction                                    | §2.1, §5.1             | half-landed — classification yes, CLI shape no                      |
| Changeset script (sh → Node + argv Zod)                        | §2.4                   | landed as `changesetv2.ts`, deliberately temporary                  |
| Matcher shortening scope keys                                  | §2.2                   | works; custom-matcher keys are the gap                              |
| Commitlint using the #212 function                             | §2.3, §5.1             | **no** — still on the old micromatch engine                         |
| Commitlint header max length                                   | §2.5, plan §5.2        | `150`; collapse rule proposed                                       |
| Cute commit-scope report (local buckets)                       | §6 commit-scope, §4.14 | scope axis exists; **area axis destroyed by `getGitChangedFiles`**  |
| `scope-affected` sharing the engine                            | §6 commit-scope        | same change as the commitlint fix                                   |
| PR auto-labeling from scopes/types                             | §6 commit-scope        | vocabulary ready in `LABEL_TAXONOMY.md`; trigger blocked            |
| Remove dup `snail-sh`                                          | §3                     | 796-line bash logger + 298-line scratch file still shipped          |
| Pretty logging (doctor + scope reporting)                      | §6 futures             | logger already owns the primitives                                  |
| cli-app cleanup onto the argv schema                           | §6 cli-app, §4.16      | two competing yargs bridges                                         |
| cli-app + logger CLI tables                                    | §6 cli-app             | logger owns `table.ts` already                                      |
| Inquirer / file-path picker / UI for missing flags             | §6 cli-app             | **nothing of the kind in the tree** — greenfield                    |
| Doctor as a cli-app consumer                                   | §6 doctor              | sequenced after the cli-app cleanup, deliberately                   |
| Package-field Zod validation                                   | §6 doctor, §4.16       | exists in build-config; doctor hand-rolls; owner undecided          |
| Exports field via node-utils fileExists Zod schema             | §6 doctor, §4.8        | **blocked** — that schema uses the naive path resolver              |
| Private/public access inconsistency report                     | §6 doctor, §4.4        | one live case (storybook-config)                                    |
| `cli-highlight`                                                | §6 doctor              | evaluate against logger's existing helpers first                    |
| Auto-updating exports / drop-in code block                     | §6 doctor              | auto-mutation barred by rule 2.4; printed block is fine             |
| Emits CJS but `require` missing from exports                   | §4.3, §4.10, §6        | **confirmed live in node-utils**; generalized to all formats        |
| Multiple entry points                                          | §6 doctor              | existence covered; format/order not                                 |
| Auditing `bin` scripts for abandonment/breakage                | §6 doctor              | existence+mode covered; `--help` liveness not                       |
| Auxiliary builds                                               | §6 build               | §10.5 defines it; discovery collector missing                       |
| Nx `runtime:*` tags                                            | §6 build, §4.9         | **zero tags exist**; `buildConfig` too unreliable to derive from    |
| README skill / package key reorder / keywords                  | §6 futures, §4.12      | ordering already written and disabled in prettier options           |
| Per-package check/fix/md:fix, api-extractor, coverage          | §6 futures             | not started                                                         |
| Prepackage-adjacent enumeration (docs/SB/chromatic/API report) | §6 futures             | should read resolved Nx targets, not guess                          |
| `pnpm outdated` with pinned/frozen versions                    | §6 futures             | no pin mechanism exists                                             |
| Env variable reporting                                         | §6 futures             | `defineEnv` already declares the full set — renderer only           |
| `.gitignore` diff vs standard                                  | §6 futures             | not started                                                         |
| Published-versions list                                        | §6 futures             | §11.3 maintains it by hand today                                    |
| Cycle each bin's `--help`                                      | §6 doctor              | four of workspace's eight bins are `.sh` — runner can't assume Node |

## 7. Open decisions this audit adds

Numbered continuing from §14 of the plan.

11. **Which scope engine survives** — `resolveRepositoryScopes` (classifier-based) or
    `matchScopesForPath` (micromatch-per-path)? The former is the #212 direction and already handles
    evidence; the latter is what commitlint and `scope-affected` currently use. This is plan §14
    item 1's "which scope command is authoritative" question, now answerable with the code in front
    of us.
12. **Scope collapse target and threshold** — `root`, or a new umbrella scope? At what count?
13. **Owner of the package Zod schema** — doctor (alongside the export-plan helper, per B1) or
    config (alongside policy)? It currently sits in the package B1 wants deleted.
14. **Nx `runtime:*` tags — generate them, or skip tag enforcement?** Narrowed: not a
    `buildConfig`-vs-tag question, since that key is dead (§4.6). Tags _prevent_ a boundary
    violation at build time; Doctor observation only _reports_ it. That trade-off is the decision
    (§4.9).
15. **`gbt-changeset` default behavior** when 7.2/7.3 land — keep committing, or adopt 7.3's
    side-effect-free base flow and break the current bin's behavior?
16. **How the config→workspace edge is cut** (§4.7) — publish workspace early, or invert so the
    commitlint factory receives resolved scopes from the caller? This gates every config release and
    is a prerequisite for decision 11, because the old scope engine is currently part of config's
    _public_ API.
17. **Whether config's workspace re-exports are a supported contract.** They are published today. If
    they were unintentional, withdrawing them is a breaking change that needs its own version step
    before either 11 or 16 can proceed cleanly.
