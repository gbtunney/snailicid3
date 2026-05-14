# GitHub Actions Release Flow

## Naming conventions

- `dispatch-*` — manual `workflow_dispatch` workflows
- `push-*` — push-triggered workflows
- `pr-*` — pull-request-triggered workflows
- `call-*` — reusable `workflow_call` workflows

## Reusable workflows

- `call-pipeline.yml` — reusable build/test/check/docs runner.
- `call-detect-pr-kind.yml` — reusable PR classifier.

> `pipeline` should stay dumb. It should not know about releases, changesets, publishing, or PR
> kinds.

## PR classifier

`call-detect-pr-kind.yml` classifies a PR by diff shape.

Outputs:

- `has_added_or_modified_changeset`
- `has_deleted_changeset`
- `has_package_changes`
- `has_changelog_changes`
- `is_release_pr`

A generated release PR is true only when:

- source branch is `release/main`
- PR deletes consumed `.changeset/*.md`
- PR changes `package.json`
- PR changes `CHANGELOG.md`

## PR workflows

### Normal PRs

`pr-main.yml`

Runs when:

- PR targets `main`
- PR is not a generated release PR
- PR does not add/modify `.changeset/*.md`

Runs:

- build
- test
- check
- no docs build

### Changeset / release-intent PRs

`pr-changesets-version.yml`

Runs when:

- PR targets `main`
- PR adds or modifies `.changeset/*.md`

Runs stricter validation:

- build
- test
- check
- docs build
- require clean repo

This catches cases where docs generation changes tracked files.

### Generated release/version PRs

`pr-release.yml`

Runs when:

- PR targets `main`
- `call-detect-pr-kind` says `is_release_pr == true`

Generated release PR shape:

- source branch is `release/main`
- deletes consumed `.changeset/*.md`
- changes package versions
- changes changelogs

Runs:

- build
- test
- check
- docs build
- require clean repo

## Push release flow

`push-release.yml` runs on pushes to `main`.

It first runs a cheap detect job.

### If no release work is needed

- detect runs
- pipeline skips
- release skips

### If pending changesets exist

Condition:

- current `main` contains `.changeset/*.md`

Then:

- pipeline runs
- `pnpm changeset version` runs
- generated version/changelog/package changes are committed
- branch `release/main` is force-pushed
- version PR `release/main → main` is created or updated

### If generated version PR was merged

Condition:

- no pending `.changeset/*.md`
- head commit message contains `: version packages`

Then:

- pipeline runs
- `pnpm changeset publish` runs through `changesets/action`
- npm publish happens
- GitHub releases/tags are created by publish flow

## Intended release sequence

1. Feature branch adds code and, when needed, adds `.changeset/*.md`.
2. PR into `main` opens.
3. If no changeset was added, `pr-main` runs normal CI.
4. If a changeset was added/modified, `pr-changesets-version` runs stricter CI with docs build and
   clean repo requirement.
5. After merge to `main`, `push-release` sees pending changesets.
6. `push-release` creates or updates `release/main`.
7. `pr-release` validates the generated version PR.
8. If docs build changes tracked files, the generated release PR fails until docs are committed.
9. Merge `release/main`.
10. `push-release` sees a version-packages merge and publishes.
11. Tags/releases are created only by the publish job, not by PR validation jobs.

## Required branch protection checks for `main`

Use stable, unique job names.

Recommended:

- `push-main / required` or `ci-main / required`
- `pr-main / required`
- `pr-changesets-version / required`
- `pr-release / required`

Do not make report/autofix jobs required.

Watch out: if skipped required checks cause GitHub branch protection problems, collapse PR routing
later into one `pr.yml` router with one final always-present required job, such as `pr / required`.
