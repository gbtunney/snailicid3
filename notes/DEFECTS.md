# Defect Checklist — from the 2026-08-14 audit

Scannable companion to `plan-state-audit-2026-08-14.md`. Every item there, one line each, with the
file to open. Detail lives in the audit section noted at the end of each line.

Three buckets: **A** = fix it, no thinking required. **B** = real bug, needs a small change plus a
test. **C** = needs your decision before anyone writes code.

Severity: 🔴 blocks a release · 🟠 wrong in a way that will bite · 🟡 cleanup

---

## ⛔ Intentionally retained Doctor fixture

Only `@snailicid3/example-package` is deliberately broken for the active export collector.
`EXP-EXAMPLE-001` protects its mismatched declared/emitted exports until that fixture is replaced.

Logger's `EXP-LOGGER-001` fixture was retired in #232 when its declaration conditions were fixed.
The reserved `API-LOGGER-001`, `PACK-LOGGER-001`, and `RUNTIME-LOGGER-001` IDs describe future
collectors; they do not protect unrelated logger defects from repair.

The executable registry in `packages/doctor/src/fixtures.ts` is authoritative. Any new retained
breakage needs a registry entry, expected evidence, a regression test, and a retirement gate.

---

## A. Quick fixes (no decisions)

- [x] **A1** 🔴 `packages/doctor/package.json:87` — export target reads `./dist/indklex.js`, should
      be `index.js`. Doctor's own collector flags this once anything builds. → §4.2
- [x] **A2** 🟡 `package.json:38` — `"inspect:deps": "pnpm inspect:dependencies"` calls a script
      that no longer exists (removed with the bin in Phase 5). → §4.5
- [x] **A3** 🟡 `packages/logger/package.json` — `files` lists a `bin` directory that does not
      exist. Leftover from the `snail-sh` move. → §4.11
- [x] **A4** 🟡 `packages/config/src/build-exporter.ts:6` — the TODO says "get rid of this", but
      plan §6 corrected that: its `dist/*.json` outputs are published exports. Anyone obeying the
      comment breaks consumers. Update the comment. → §4.12

## B. Real bugs

### Export maps

- [x] **B1** 🔴 `packages/node-utils/package.json` — builds `['esm','cjs','ts']` but declares only
      `{"import": "./dist/index.mjs"}`. **CJS is emitted and unreachable**, and there's no `types`
      condition. Public at `0.1.0`. No guessing needed on filenames: its own `main` and `types`
      already point at `./dist/index.cjs` and `./dist/index.d.cts`, so the fix is adding
      `"types": "./dist/index.d.cts"` **first**, then `"require": "./dist/index.cjs"`. → §4.3
- [x] **B2** 🟠 `packages/utils/package.json` — emits a browser `iife` bundle with
      `include_dependencies: true` and declares no matching export condition. Published dead weight.
      → §4.10
- [x] **B3** 🟠 `packages/config` + `packages/workspace` — `types` is listed **after** `import`.
      Conditions are first-match-wins; `types` must come first. `build-config` gets it right, so
      this is incidental, not deliberate. → §4.3
- [x] **B4** 🟡 `packages/cli-app/package.json` — bare-string root export, no `types` condition. →
      §4.3 Correct as landed: cli-app is ESM-only, so a single `types` is right.
- [x] **B14** 🔴 A lone `types` condition ahead of both the `import` and `require` branches resolves
      first for every consumer, so ESM importers were handed the **CommonJS** declaration. `utils`
      and `node-utils` had that shape after the first B1/B2 pass; `color`, `types` and
      `storybook-config` had no `types` condition at all and fell through to the top-level field,
      which points at the CJS declaration for the same reason. Fixed by putting `types` alongside
      `default` inside each branch. → §4.3
- [x] **B15** 🟠 Same fix applied to `color`, `types` and `storybook-config`, which my original §4.3
      table never listed. → §4.3

Filenames for B14/B15 came from a real build, not convention — the two families differ, and guessing
would have pointed at files that do not exist:

| packages                                      | ESM entry   | ESM declaration | CJS entry   | CJS declaration |
| --------------------------------------------- | ----------- | --------------- | ----------- | --------------- |
| `utils`, `color`, `types`, `storybook-config` | `index.js`  | `index.d.ts`    | `index.cjs` | `index.d.cts`   |
| `node-utils`                                  | `index.mjs` | `index.d.mts`   | `index.cjs` | `index.d.cts`   |

An earlier draft of B14 claimed `.d.mts` for `utils`; that was wrong — only `node-utils` emits
`.mjs`. The top-level `types` field is deliberately left on the CJS declaration, matching `main` for
legacy node10 resolution. `example-package` remains the registered fixture. Locked in by the
`B14/B15` test in `packages/doctor/src/manifest.test.ts`, which asserts per-mode routing and the
absence of a bare top-level `types` condition.

### buildConfig

- [x] **B5** 🟡 **Delete the `buildConfig` key from all 9 manifests** — it is dead metadata, read by
      no code. Declared on types, doctor, build-config, storybook-config, config, utils,
      example-package, color, and apps/playground. `defineBuildPlan` parses manifests through
      `schemaBasePackage`, which does not pick it up; the live values are `runtime`/`product` passed
      **inline per entry** in each `tsdown.config.ts`, and `buildStrategy` is not in the plan schema
      at all. Leaving stale values around is worse than absence — the wrong ones actively mislead. →
      §4.6
- [x] ~~**B6** buildConfig missing on cli-app/logger/node-utils/workspace~~ — **withdrawn.** Absence
      is the correct state; the four packages that omit it are right and the nine that declare it
      are the outliers. See §4.6.

### Scope resolution

- [x] **B7** 🟠 `repository-scopes.ts:41-47` — custom classifiers spread **after** package
      classifiers, so a custom matcher key equal to a shortened package name silently replaces that
      package's own classifier. The enum hides it (Set dedupes), so only the file→scope mapping
      changes. Latent collision with the built-in `scripts`/`actions`/`notes` defaults. → §2.2
- [x] **B8** 🟠 `core/git.ts:75-83` — `getGitChangedFiles` calls git with **no `cwd`** and
      early-returns silently on failure. With `getRepoRoot({fallbackToCwd:true})` at `commit.ts:74`,
      running outside a repo gives you a confident `chore(root): …` having inspected nothing. →
      §4.14
- [x] **B9** 🟠 `cli/commit.ts:100` + `:119` — verbose evidence and the machine-readable scope value
      both go to **stdout**, so `--csv --verbose` emits both on one stream. Capturing stdout from
      these bins is an established pattern (`changesetv2.ts:164` does it). → §4.15
- [x] **B10** 🟡 `cli/commit.ts:136-144` — `--scope` override returns `matches: {}`, so the evidence
      report comes out **empty** whenever you pass an explicit scope. → §6 (report, step 4)

Notes on the B7–B10 fixes:

- **B7** now unions patterns on a key collision instead of overwriting, so a custom matcher key that
  matches a shortened package name no longer drops that package's own classifier.
- **B8** threads `cwd` through every git invocation and **throws** on a failed one rather than
  returning an empty list. `getGitChangedFilesByArea()` is new and returns per-file areas
  (`staged`/`unstaged`/`untracked`/`range`); `getGitChangedFiles()` is now a thin wrapper over it. A
  file that is staged _and_ further modified carries both areas — the case the commit-scope report
  most needs, and the one the old flattening destroyed.
- **B9** verbose evidence moved to **stderr**, so stdout carries only the scope value callers
  capture. `changesetv2.ts` captures `scope-affected` stdout the same way.
- **B10** `--scope` no longer blanks the report. Detection still runs, and the evidence now prints
  `detected:`, `override:`, and `dropped by override:` so an override that hides a real scope is
  visible.

This unblocks step 1 of the commit-scope report — per-file provenance is now available as the
report's data model rather than a nicety behind a verbose flag.

### Shipped shell duplication

- [x] **B11** 🟠 `packages/workspace/bin/snail-sh-logger.sh` — **796 lines**, a complete second
      logger in bash, shipped in `files`. Phase 3 called for a minimal bootstrap floor only.
      `bootstrap.sh` probes for it (`:20`), so trimming needs that probe reworked. → §3
- [x] **B12** 🟡 `packages/workspace/bin/snail-sh-test.sh` — 298 lines of scratch (still has `#TODO`
      and a stray `echo ${RED}----`), shipped, and reachable via config's `demo:logger`. → §3
- [x] **B13** 🟡 `packages/cli-app/package.json` — ships `cli-app-example` as a **public bin**. Not
      in the §6.1 destination map; nobody appears to have decided this. → §4.11

---

## C. Decisions needed

Each of these has code waiting on your answer. Roughly in dependency order — C1 gates C2, which
gates C3.

- [x] **C1** 🔴 **DECIDED 2026-08-14 — invert the dependency; do not publish workspace.**
      `workspace` is `private: true` _deliberately_: making it public makes the release tooling
      treat it as a publish candidate before it is ready. So "publish workspace to fix the edge" is
      off the table, and the remaining route is the one plan §4 already prescribes — config's
      commitlint factory must **receive** resolved scopes from its caller instead of importing them
      from workspace. Until that lands, `@snailicid3/config@0.2.0` remains unpublishable (rule 2.7).
      **Smaller than it looked, after C2.** config touches workspace in three places. The ~15
      re-exports in `src/index.ts` are unpublished and can simply be **deleted** rather than
      inverted. Only the commitlint factory genuinely needs the inversion —
      `commitlint/api-functions.ts` and `commitlint/workspace.scopes.ts`, eight symbols between
      them. This is also #206's intent-vs-inventory split showing up in practice: privacy is being
      used as a release-phase signal because there is no explicit intent axis. → §4.7
- [x] **C2** 🟠 **DECIDED 2026-08-14 — not a contract; withdraw freely.** Established by dates, not
      judgement: `config@0.2.0` published **2026-07-25**, and every workspace re-export first
      appears in config's barrel on **2026-08-10** (`653d7a4`, scope matchers) or **2026-08-12**
      (`7a8d7ff`, package-manager helpers). The published `0.2.0` tarball's `dist/index.js` contains
      **zero** occurrences of `matchScopesForPath` or `runPackageBinary`. No consumer can depend on
      them because they have never shipped. No deprecation window and no version step are required.
      History note: the 08-10 exports were not a cross-package edge when written — they pointed at
      config's own `./workspace/scope-matchers.js`, before `@snailicid3/workspace` existed. The
      08-12 Phase 3 commit moved the implementation out and mechanically repointed them, which is
      how an internal barrel export quietly became a cross-package one. → §4.7
- [x] **C3** 🔴 **DECIDED 2026-08-14 — the #212 classifier engine survives; finish it properly.**
      Migrate `scope-affected` (`cli/affected.ts:129`) and config's commitlint scope-enum
      (`api-functions.ts:51`, `workspace.scopes.ts:38`) onto `resolveRepositoryScopes`, then delete
      `matchScopesForPath` and fold `DEFAULT_SCOPE_PATH_MATCHERS` into the classifier layer. Add a
      cross-engine agreement test **before** deleting anything, so the migration is proven rather
      than assumed. Two constraints: the old matcher surface is re-exported from config's _public_
      barrel, so removing it is a breaking change to `@snailicid3/config` and needs its own version
      step (C2); and folding the defaults in also retires B7's latent `scripts`/`actions`/`notes`
      collision. → §2.3, plan §5.1
- [x] **C4** 🟠 **DECIDED 2026-08-14 — keep it, revisit soon.** `cli/changeset.ts` and the
      `decideBranchAction` state machine stay in the tree unwired. Not dead code by accident —
      parked deliberately. → §4.1
- [x] **C5** 🟠 **DECIDED 2026-08-14 — keep the current flow, minus the commit.** `gbt-changeset`
      keeps working the old way for now; the only change is that it **stops after creating the
      changeset** instead of staging and committing it. That is `changesetv2.ts:196-205`
      (`git add` + the `scope-commit --checked-commit` call). Branch creation, scope resolution, and
      the reporting stay. This is 7.3's side-effect-free base flow arriving early and narrowly,
      without the state machine. → §2.4
- [ ] **C6** 🟡 **Scope collapse target and threshold** for `header-max-length`. A 12-package header
      measured 159 vs the limit of 150, and the scope list alone is ~115. Raising the number only
      defers it. Collapse to `root` past _N_? What's _N_? → §2.5, plan §5.2
- [x] **C7** 🟡 **DECIDED 2026-08-14 — layered schemas, rooted in node-utils.** Doctor owns the
      _diagnostic_ schema and extends a shared identity schema; config, cli-app and workspace
      consume the same base. The proposed layering was right; only the base package moved down one
      level. **Why not `workspace`:** it is `private: true` by the C1 decision, while `cli-app`
      (`0.1.0`) and `config` (`0.2.0`) are public. A public package importing an unpublished one is
      rule 2.7 — precisely what makes `config@0.2.0` unpublishable today — so rooting the schema
      there would spread that defect from one public package to two, and would then have to be
      undone by the very C1 inversion already agreed. **Why `node-utils`:** plan §3.3 already draws
      this line with this exact example — _"readPackageJson(path) may be node-utils /
      getWorkspacePackages() is workspace."_ Validating one manifest's identity is
      `readPackageJson`-shaped; repository-wide discovery is workspace-shaped. node-utils is also
      already a runtime dependency of cli-app, doctor and workspace. Layering is recorded below.
      build-config keeps its own banner copy until B1 folds it into config — it is tsc-only and
      imported by eight packages' `tsdown.config.ts`, so importing node-utils would close a
      `node-utils:build → build-config:build` bootstrap cycle. → §6, §4.16
- [x] **C9** 🟡 **DECIDED 2026-08-14 — doctor becomes a cli-app consumer.** Doctor is a CLI, so it
      should use the CLI framework. The direction is legal (private → public) and adds no cycle:
      cli-app depends on color, logger, node-utils and utils, none of which reach doctor. Not a
      regression either — `src/cli.ts` already uses node-utils' `parseArgv`, so this is about what
      it still hand-rolls: a maintained `HELP` string, manual `--help` interception, and no
      `--version`. cli-app generates all three from the schema. **Caveat:** cli-app still carries
      its own yargs bridge duplicating node-utils' `parseArgv` (§4.16), so doctor adopting it puts a
      second consumer on the duplicated path. That raises the priority of collapsing cli-app onto
      the argv primitives rather than lowering it — do that cleanup close behind, not much later. →
      §6

- [ ] **C8** 🟡 **Where does `runtime` live for Nx dependency-boundary enforcement?** Narrowed
      2026-08-14: this is _not_ a `buildConfig`-vs-tag question, since `buildConfig` is dead (B5).
      The live declaration is the per-entry `runtime` in each `tsdown.config.ts`, which Nx cannot
      read for `runtime:node`/`browser`/`universal` boundary rules. So the real question is whether
      to add Nx tags derived from the tsdown plan, or skip tag enforcement and let Doctor observe
      the emitted dependency graph instead (§10.6 prefers inference). There are currently **zero**
      Nx tags. → §4.9

---

### C1/C7 — workspace and doctor go public later

Noted 2026-08-14: `workspace` and `doctor` are `private: true` as a **release gate**, not
permanently; both flip to `private: false` when they are ready to publish. That changes two things
and leaves one unchanged.

**Changed — the rule 2.7 argument is temporary.** Config importing workspace stops being a
publishability blocker once workspace is published. But it blocks **today**, and for as long as the
gate stays shut, so C1's inversion is still what unblocks a config release now rather than
eventually.

**Unchanged — the C7 placement.** Even with workspace public, the identity schema belongs in
node-utils, for reasons that survive the flip:

- **Weight.** workspace pulls `cosmiconfig`, `cosmiconfig-typescript-loader`, `micromatch`, git
  handling and package discovery. Routing cli-app's banner through it drags all of that into every
  consumer of a public CLI framework, to read a name and a version. node-utils is far lighter.
- **Release coupling.** cli-app is public at `0.1.0` today; workspace publishes later. Depending on
  it would tie cli-app's release train to workspace's gate.
- **Ownership.** Plan §3.3's line does not move: one manifest's identity is
  `readPackageJson`-shaped; repository-wide discovery is workspace-shaped.

**Prerequisite for the flip.** Workspace is private specifically because the release tooling
otherwise treats it as a publish candidate before it is ready. Flipping `private: false` without an
explicit intent axis re-creates exactly that problem — which is [#206]'s
`observe | prepare | publish` split, currently deferred. Land the intent signal **before** the flip,
or the flip reintroduces the thing the privacy flag is working around.

[#206]: https://github.com/gbtunney/snailicid3/issues/206

### C7 — why two schemas, not one

Sharpened 2026-08-14. The base schema is **not** a completeness check; it is a _reader's_ schema —
"give me enough to render a banner or an app header." That distinction is the whole reason this kept
feeling ambiguous, because `packageSchema` was doing two jobs under one name.

|                      | identity (node-utils)                                               | diagnostic (doctor)                            |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| Question             | "what is this package called?"                                      | "is this package correct?"                     |
| Strictness           | lenient — `name` + `version` required, rest optional with fallbacks | strict, opinionated                            |
| On a sparse manifest | degrades                                                            | reports a finding                              |
| Failure mode         | must never throw                                                    | never throws either — findings, not exceptions |
| Consumers            | cli-app, config, workspace, doctor                                  | doctor only                                    |

**The current schema is the completeness one, mislabeled.** `schemaPackageMetaBanner` picks from
`schemaBasePackage`, so it inherits required `author` (with a valid `email`), required
`description`, and required `repository`, on top of a name regex, a license enum and a semver regex.
That is house style, which is doctor's job — it is the wrong shape for a banner reader.

Inside this repo only `@snailicid3/root` would throw on it (missing `author.email` and
`description`), because every workspace package is house-styled. But **cli-app is public**: its
banner reader will meet arbitrary consumer manifests, and plenty of valid ones carry no
`author.email` and no `repository`. A banner should degrade, not crash someone's build.

So: build a lenient identity schema in node-utils rather than re-exporting the existing one, and
move `schemaBasePackage`'s strictness into doctor as diagnostics when build-config is folded into
config (B1).

### C7 schema layering

```text
node-utils   identity: name, version, description, author, license, repository
    |
    +-- cli-app     banner, --version, header       (public)
    +-- config      policy needing manifest facts   (public)
    +-- workspace   extends: path, deps, privacy    (private)
    +-- doctor      extends: exports, bin, files    (private)
```

## Core migration progress

**Step 1 — node-utils package schemas.** `packageNameSchema`, `packageVersionSchema`,
`packageManagerFieldSchema`, `packageIdentitySchema`, `jsonTextSchema`, `readPackageManifest`.
Identity validates _shape_, not presence: every field is optional, because doctor reports a missing
name as `MANIFEST_NAME_MISSING` and could not do so if parsing rejected the manifest first, and
`resolvePackageManager` reads one field from a root manifest without caring about identity.
`readPackageName` and `resolvePackageManager` rewired onto it. (Audit instructions 2, 5.)

**Step 2 — schema-parsed discovery and a snapshot.** `workspacePackageRecordSchema`,
`workspacePackageManagerOutputSchema`, `getWorkspaceSnapshot` / `safeGetWorkspaceSnapshot`.
`normalizeWorkspacePackage` is gone; a malformed record now fails the listing instead of vanishing
from it. `normalizeRepoPath` decides containment with `path.relative` and emits POSIX
repository-relative paths, with the root at `'.'`. (Audit instructions 3, 4, 7.)

Three latent defects surfaced, each previously masked by absolute paths:

- Root was excluded by comparing `path.resolve(pkg.path)` to the repo root. With relative paths,
  `path.resolve('.')` resolves against the **process** directory, so root survived the filter and
  its `./**` classifier matched every file.
- Discovery defaulted `repoRoot` to `process.cwd()`, but a recursive package-manager listing is
  repository-wide, so running from inside a package reported the root package as outside the root.
- `collectChangesetScopes` normalized a changeset path and then discarded the result for absolute
  inputs.

Removing `getChangedWorkspacePackagesFromGit` and `isInsideDir` (no production call sites, per the
audit) was required, not incidental: they were the only reason `git.ts` imported `packages.ts`, and
defaulting discovery to the git root would otherwise have closed an import cycle.

**Step 3 — one scope model.** `core/workspace-scopes.ts` implements plan §5's contract, which had
been specified but never built: `ReadonlyArray<string> | true | false | undefined`, with `true` a
manual scope, `false` a deletion, `undefined` inheritance, and an empty array rejected rather than
silently meaning deletion the way `null` and `[]` did in `resolveScopePathMatchers`.
`getWorkspaceScopes()` derives the Commitlint `scope-enum` names and the file classifiers from the
**same** map, so the two can no longer drift, and records contributing sources per scope so a merged
collision is inspectable. `STANDARD_WORKSPACE_SCOPES` moved here from the legacy matcher module.
Root is excluded by path, and packages that shorten to the same scope are unioned. (Audit
instructions 8, 10, 11 in part.)

Still ahead: rewire `scope-affected` and config's commitlint enum onto this model, then delete
`scope-matchers.ts` and `isRootPackageName` (audit 9, 12, 14), and the barrel reduction (15).

**Step 4 — one engine.** `scope-affected`, `scope-commit` and Commitlint's `scope-enum` all resolve
through `getWorkspaceScopes` + `resolveRepositoryScopes`. `scope-matchers.ts` deleted, along with
`isRootPackageName`. `scope-affected` stops running its own `git diff` and takes the same
changed-file input `scope-commit` uses. Nx project names are resolved back through the snapshot
before root is decided — the gap flagged against audit instruction 14. Config's unpublished
workspace re-exports deleted per C2. (Audit 9, 12, 14.)

Two things surfaced. Publishing the _resolved classifiers_ as Commitlint metadata created a feedback
loop: the CLI reads that metadata back as overrides, so shortened package names merged with the
`--keep-prefix` names and `scope-commit --keep-prefix` emitted both spellings of one scope. Metadata
is now the consumer's overrides only. Separately, moving discovery to the top of `scope-affected`
made `--changeset-only` shell out to the package manager for nothing; discovery is lazy.

**Step 5 — argv and the barrel.** `parseArgv` now declares boolean keys to yargs, derived from the
schema. Without that, `--commit chore subject` parsed as `commit: 'chore'` and lost a positional, so
no flag taking a following token could migrate. `scope-commit` and `scope-affected` are off their
hand-rolled switches, preserving every alias and the `Unknown argument:` wording that package
scripts match on. Note `--no-nx` and `--no-repo-scopes` arrive through yargs' boolean-negation as
`nx: false` / `repoScopes: false`, which the schemas model explicitly.

`core/index.ts` is now an explicit barrel rather than `export *`: while both engines existed it
re-exported them side by side, making the obsolete one look equally canonical. `array.js` and
`paths.js` are internal. The redundant representation adapters superseded by `WorkspaceSnapshot`
(`getWorkspacePackagesLookup`, `getWorkspacePackagesObject`, `workspacePackagesToArray`,
`getWorkspaceNodeModulesRoot`) and the duplicated `validPackageName` regex are deleted. (Audit 13,
15.)

**All fifteen audit instructions are now addressed.**

## Core audit (external, 2026-08-14) — verification

A function-by-function audit of `packages/workspace/src/core` was reviewed against #218's head.
Verdicts checked here rather than taken on trust.

**Confirmed.** All six "no production call site" claims hold — zero non-test, non-declaration
references for `getChangedWorkspacePackagesFromGit`, `getWorkspaceNodeModulesRoot`,
`getWorkspacePackagesLookup`, `getWorkspacePackagesObject`, `workspacePackagesToArray` and
`readPackageName`. `findNearestPackageJson` does use `searchDir.startsWith(repoRoot)`
(`packages.ts:27`), which prefix-matches a sibling such as `/repo-other`. `scope-affected` does
still call `matchScopesForPath`.

**More precise than §2.3.** Commitlint does not literally call `matchScopesForPath`; it consumes the
same legacy _definitions_ via `resolveScopePathMatchers`. That is why the two engines agree today
without sharing a classification contract — a sharper statement of the same defect.

**One real gap — instruction 14 is not standalone.** "Remove `isRootPackageName()` and identify root
by normalized workspace path" works at only one of its two call sites.
`config/commitlint/workspace.scopes.ts:53` iterates package records that carry `path`, so the
replacement applies. `workspace/cli/affected.ts:145` normalizes **Nx project names** from
`nx show projects --affected` — bare strings with no path attached — so the replacement cannot apply
until those names are resolved back to package records through the snapshot. Instruction 14
therefore depends on 7 (`WorkspaceSnapshot`) and 9 (rewire `scope-affected`), and also assumes Nx
project names equal package names, which holds here only because they are inferred from
`package.json`.

**Simplification the audit lacks.** It says to remove config's workspace re-exports "eventually,
after consumers import `@snailicid3/workspace` directly." Per C2 those re-exports have never been
published, so there are no consumers and they can be deleted immediately.

**Newly surfaced.** Plan §5's override contract (`readonly string[] | true | false | undefined`) was
written as settled but never implemented — `resolveScopePathMatchers`' null/empty-array deletion
directly contradicts it. Neither the plan's own status nor this checklist had flagged that.

## Sequencing note

If you want the shortest path to something shippable: **A1–A4, then B1–B6** (all export/manifest
reality, all mechanical), then **C1**. C1 is the one that unblocks the most — nothing about config
can be released until it's answered, and C2/C3 both sit behind it.

The scope-report work (§6) depends on **B8** landing first, since per-file git provenance is its
data model, not a nicety.
