# GITHUB ACTIONS RELEASE STUBS

## Intended flow

1. Feature PRs into `main` run the normal required CI gate.
2. PRs from `release/**` into `main` run a stricter release-candidate gate.
3. PRs from `changesets/**` into `main` run the version-package gate and must
   prove docs were rebuilt after version bump.
4. Pushes to `main` run the release orchestration. This can either open/update
   the Changesets version PR or publish if the version PR was merged.
5. Tags should be produced only by the publish/release job, not by PR validation
   jobs.

## Required branch protection checks for `main`

Use stable, unique job names as required checks:

- `ci-main / required`
- `pr-main / required`
- `pr-release / required`
- `pr-changesets-version / required`

Do not make report/autofix jobs required.
