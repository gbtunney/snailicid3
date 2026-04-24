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

---

## `.github/workflows/ci-main.yml`

Runs on every push to `main`. This answers: “is main busted after merge?”

```yaml
name: ci-main

on:
  push:
    branches:
      - main

concurrency:
  group: ci-main-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: read

env:
  HUSKY: 0

jobs:
  required:
    name: required
    uses: ./.github/workflows/pipeline.yml
    with:
      mode: abort_on_error
      check_mode: check
      require_lockfile: true
      require_clean_repo: true
      run_build: true
      run_test: true
      run_docs_build: false
      pnpm_cache: true
```

---

## `.github/workflows/pr-main.yml`

Blocks normal PRs into `main` if the repo is busted.

```yaml
name: pr-main

on:
  pull_request:
    branches:
      - main

concurrency:
  group: pr-main-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  HUSKY: 0

jobs:
  required:
    name: required
    if: >-
      ${{
        !startsWith(github.head_ref, 'release/') &&
        !startsWith(github.head_ref, 'changesets/')
      }}
    uses: ./.github/workflows/pipeline.yml
    with:
      mode: abort_on_error
      check_mode: check
      require_lockfile: true
      require_clean_repo: true
      run_build: true
      run_test: true
      run_docs_build: false
      pnpm_cache: true
```

---

## `.github/workflows/pr-release.yml`

Blocks `release/**` PRs into `main`. This is stricter than normal CI.

```yaml
name: pr-release

on:
  pull_request:
    branches:
      - main

concurrency:
  group: pr-release-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  HUSKY: 0

jobs:
  required:
    name: required
    if: ${{ startsWith(github.head_ref, 'release/') }}
    uses: ./.github/workflows/pipeline.yml
    with:
      mode: abort_on_error
      check_mode: check
      require_lockfile: true
      require_clean_repo: true
      run_build: true
      run_test: true
      run_docs_build: true
      pnpm_cache: true
```

---

## `.github/workflows/pr-changesets-version.yml`

Blocks `changesets/**` PRs into `main` until docs are rebuilt and committed.
This assumes docs generation changes tracked files.

```yaml
name: pr-changesets-version

on:
  pull_request:
    branches:
      - main

concurrency:
  group: pr-changesets-version-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  HUSKY: 0

jobs:
  required:
    name: required
    if: ${{ startsWith(github.head_ref, 'changesets/') }}
    uses: ./.github/workflows/pipeline.yml
    with:
      mode: abort_on_error
      check_mode: check
      require_lockfile: true
      require_clean_repo: true
      run_build: true
      run_test: true
      run_docs_build: true
      pnpm_cache: true
```

---

## `.github/workflows/release.yml`

Runs only after merge to `main`. This is where Changesets should create/update
the version PR, or publish after the version PR is merged.

```yaml
name: release

on:
  push:
    branches:
      - main

concurrency:
  group: release-main
  cancel-in-progress: false

permissions:
  contents: write
  pull-requests: write
  id-token: write

env:
  HUSKY: 0
  NPM_CONFIG_PROVENANCE: true

jobs:
  release:
    name: release
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Build docs
        run: pnpm -r --if-present run docs:build

      - name: Require clean repository before release action
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            echo "Repository became dirty before release. Commit generated docs/version files first."
            git status --porcelain
            exit 1
          fi

      - name: Create version PR or publish packages
        id: changesets
        uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
          title: 'chore(release): version packages'
          commit: 'chore(release): version packages'
          createGithubReleases: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Minimal fixes needed in uploaded workflows

### `pipeline-dispatch.yml`

Add the missing `check_mode` input:

```yaml
check_mode:
  description: Check routine mode
  required: true
  default: check
  type: choice
  options:
    - fix
    - check
    - skip
```

Also pass `pnpm_cache` to the reusable workflow:

```yaml
pnpm_cache: ${{ inputs.pnpm_cache }}
```

### `pipeline.yml`

Move pnpm cache setup from `pnpm/action-setup` to `actions/setup-node`:

```yaml
- uses: pnpm/action-setup@v4
  with:
    run_install: false

- uses: actions/setup-node@v4
  with:
    node-version: 'lts/*'
    cache: pnpm
```

The current second install attempt always runs. It should only run when frozen
install fails and `require_lockfile` is false:

```yaml
- name: Install frozen lockfile
  id: install_frozen
  continue-on-error: ${{ !inputs.require_lockfile || inputs.mode == 'report' }}
  run: pnpm install --frozen-lockfile

- name: Install relaxed lockfile
  if:
    ${{ steps.install_frozen.outcome == 'failure' && !inputs.require_lockfile }}
  run: pnpm install --no-frozen-lockfile
```

### `autofix-dispatch.yml`

This summary references `steps.scope.outputs.scope`, but no `scope` step exists.
Remove this line:

```yaml
- scope: `${{ steps.scope.outputs.scope }}`
```

---

## Rule of thumb

- PR workflows validate only.
- Autofix workflows may commit to feature/fix/release/changesets branches, never
  `main`.
- Release workflow on `main` is the only place allowed to publish or create
  release tags.
- Version/package PR must include generated docs if docs change after version
  bump.
