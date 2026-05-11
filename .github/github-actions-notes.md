# GITHUB ACTIONS RELEASE

## Flow

### Your feature branch

- → PR to main
- → pr-main CI: build + test + check (no docs needed)
- → merge

### Push lands on main

- → release.yml runs
- → sees .changeset/\*.md files
- → changesets/action creates a version PR automatically
  - Branch name: changesets/gj2k4-version-packages (auto-named)
  - Content: bumped package.json versions + CHANGELOG updates

That version PR

- → pr-changesets-version CI runs
- → build + test + docs:build + require_clean_repo
- → if docs:build generated new/changed files → repo is dirty → CI FAILS ← intentional

### You run dispatch-build-docs on the changesets/... branch

- → builds docs, commits them to that branch
- → CI reruns → clean → green

### Merge the version PR

- → release.yml runs again
- → no changeset files left (consumed)
- → commit message starts with “chore(release):”
- → publishes to npm + creates GitHub tags/releases

## Intended flow

1. Feature PRs into `main` run the normal required CI gate.
2. PRs from `release/**` into `main` run a stricter release-candidate gate.
3. PRs from `changesets/**` into `main` run the version-package gate and must prove docs were
   rebuilt after version bump.
4. Pushes to `main` run the release orchestration. This can either open/update the Changesets
   version PR or publish if the version PR was merged.
5. Tags should be produced only by the publish/release job, not by PR validation jobs.

## Required branch protection checks for `main`

Use stable, unique job names as required checks:

- `ci-main / required`
- `pr-main / required`
- `pr-release / required`
- `pr-changesets-version / required`

Do not make report/autofix jobs required.
