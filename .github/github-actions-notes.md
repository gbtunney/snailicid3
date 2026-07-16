# GitHub Actions Release Flow

## Naming conventions

- `dispatch-*` - manual `workflow_dispatch` workflows
- `push-*` - push-triggered workflows
- `pr-*` - pull-request-triggered workflows
- `call-*` - reusable `workflow_call` workflows

## Reusable workflows

- `call-pipeline.yml` - reusable build/test/check/docs runner
- `call-detect-release-state.yml` - reusable release-state detector
- `call-release-plan.yml` - reusable release planner and executor
- `call-apply-workspace-artifact.yml` - reusable artifact overlay/apply flow

`call-pipeline.yml` should stay generic and not contain release-specific branching logic.

## Release-state detector

`call-detect-release-state.yml` classifies one checked ref by current repository state.

Key outputs:

- `should_version`
- `should_publish`
- `should_skip`
- `changeset_count`
- `changeset_slugs`
- `primary_changeset_slug`
- `publish_candidates`

`changeset_slugs` and `primary_changeset_slug` are consumed by `call-release-plan.yml` to derive
deterministic `release/<slug>` branch names.

Decision model:

- `should_version == true` when pending `.changeset/*.md` files exist
- `should_publish == true` when no changesets remain and publish candidates exist
- `should_skip == true` when no release action is needed

## PR workflow

### Unified PR router

`pr-checks.yml` is the PR entrypoint for `main`.

Behavior:

- checks out the PR merge ref to verify mergeability
- runs `call-detect-release-state.yml` on the PR head SHA
- routes to one phase job:
  - `pending changeset`
  - `pending release`
  - `main`
- enforces exactly one selected phase result with a final `required` gate job

Phase behavior:

- `pending changeset`: build + test + check + docs build
- `pending release`: build + test + check + docs build
- `main`: build + test + check, no docs build

## Push release flow

`push-release.yml` runs on pushes to `main`.

It delegates directly to `call-release-plan.yml` with `dry_run=false` and `ref=github.sha`.

`call-release-plan.yml` performs release-state detection, phase planning, optional pipeline run,
version PR mutation, and publish execution.

### If pending changesets exist (`should_version == true`)

- release branch is derived from pending changeset filename slug(s)
- `pnpm changeset version` runs
- generated version/changelog/package changes are committed
- computed release branch is force-pushed
- version PR `<computed release branch> -> main` is created or updated
- `pr-checks.yml` is dispatched for that computed release branch

Branch naming rule:

- single pending changeset file: `.changeset/mighty-wombats-greet.md` ->
  `release/mighty-wombats-greet`
- multiple pending changeset files: deterministic combined slug using first sorted slug plus
  `-plus-N-more`

### If publish candidates exist (`should_publish == true`)

- release pipeline validates the ref
- workspace artifact is applied
- `pnpm changeset publish` runs
- npm publish happens

## Release plan workflows

`call-release-plan.yml` is a reusable planner/executor.

Current caller:

- `dispatch-release-plan.yml` (manual dispatch)

The reusable release plan uses the same dynamic release-branch derivation rule as `push-release.yml`
for pending changeset version PRs.

## Intended release sequence

1. Feature branch adds code and, when needed, adds `.changeset/*.md`.
2. PR into `main` opens.
3. `pr-checks` runs and selects the correct phase.
4. PR merges into `main`.
5. `push-release` sees pending changesets and creates/updates `release/<changeset-slug>` PR.
6. `pr-checks` validates that generated version PR.
7. Merge generated release PR into `main`.
8. `push-release` sees publish candidates and runs publish.

## Required branch protection checks for `main`

Use stable, unique job names.

Recommended:

- `push-main / required` (if present in your policy)
- `pr-checks / required`

Do not make report or autofix jobs required.

## Current plan snapshot

1. Keep release orchestration centralized in `call-release-plan.yml`.
2. Keep `push-release.yml` as a thin wrapper that calls `call-release-plan.yml` in real mode.
3. Keep branch naming deterministic from pending changeset slug outputs (`changeset_slugs`,
   `primary_changeset_slug`).
4. Keep `call-pipeline.yml` generic, with optional `disable_nx_cloud` input override and fallback to
   `vars.DISABLE_NX_CLOUD`.
5. Shared `call-*` workflows, composite actions, and scripts live in
   [gbtunney/snailicid3-actions](https://github.com/gbtunney/snailicid3-actions) and are referenced
   `@main`. This repository keeps only the thin caller workflows (`dispatch-*`, `pr-checks`,
   `push-*`).

### Notes on the extracted actions repository

- Composite actions inside the reusable workflows are referenced fully qualified
  (`gbtunney/snailicid3-actions/.github/actions/<name>@main`) — local `./` paths resolve against the
  caller's checkout and break cross-repo consumers.
- Version-PR titles reuse the scope-commit-derived release message; the changeset slug appears only
  in the `release/<slug>` branch name.
- The actions repository self-tests on every PR via its fixture workspace (`test-actions.yml`).
