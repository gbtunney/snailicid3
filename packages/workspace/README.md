# @snailicid3/workspace 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/workspace)](https://www.npmjs.com/package/@snailicid3/workspace)
[![license](https://img.shields.io/npm/l/@snailicid3/workspace)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Repository discovery, Git facts, package scopes, hooks, and workspace-aware commands._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)](https://git-scm.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

### Repository

- **GitHub:**
  [`@snailicid3/workspace`](https://github.com/gbtunney/snailicid3/tree/main/packages/workspace) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/workspace 🐌

---

Workspace discovery, Git and package facts, scope resolution, repository hooks, and Snailicid3's
repository-aware commands.

> **Release status:** this package is deliberately `private: true` at version `0.0.0` while its
> consumer contract is completed. It is usable inside this monorepo, but it is not currently an
> installable public package. Public config wrappers must not leave an unresolved private workspace
> dependency in a packed artifact.

## Ownership boundary

Workspace owns meaning that depends on a repository: its root, packages, Git state, changed files,
scope rules, branch workflows, hooks, and package-manager selection. Generic filesystem, process,
argv, and JSON primitives belong to `@snailicid3/node-utils`; presentation belongs to
`@snailicid3/logger`; lint and build policy belongs to `@snailicid3/config`.

Nx can enrich repository discovery, but the core library does not require Nx. A non-Nx repository or
a single package should remain a valid workspace input.

## Library surface

The root entry point groups the current API into four areas:

| Area                    | Representative exports                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Environment             | `workspaceEnvironment`, `readWorkspaceEnvironment`                                                          |
| Repository and packages | `getRepoRoot`, `getCurrentBranch`, `getGitChangedFiles`, `getWorkspacePackagesList`                         |
| Scopes and branches     | `matchScopesForPath`, `resolveScopePathMatchers`, `formatScopes`, `gatherBranchState`, `decideBranchAction` |
| Package managers        | `resolvePackageManager`, `runPackageBinary`, `runPackageManager`, `runPackageScript`                        |

```ts
import {
  getRepoRoot,
  getWorkspacePackagesList,
  readWorkspaceEnvironment,
} from '@snailicid3/workspace'

const repoRoot = getRepoRoot({ fallbackToCwd: true })
const packages = getWorkspacePackagesList(undefined, repoRoot)
const environment = readWorkspaceEnvironment(process.env)
```

## Commands

The package currently declares these repository commands:

| Command                       | Purpose                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `scope-affected`              | Resolve Nx-affected, dirty-repository, and changeset paths to scopes                 |
| `scope-commit`                | Resolve commit scopes, validate types, create messages, or run a checked commit      |
| `workspace-hook`              | Dispatch `pre-commit`, `commit-msg`, and `pre-push` hook workflows                   |
| `gbt-changeset`               | Start a changeset: create one Markdown file and attach its `changeset/<slug>` branch |
| `gbt-workflow`                | Report the read-only workflow plan, or run the explicit branch-derived commit        |
| `gbt-exec`                    | Retain the existing executable-bit helper                                            |
| `gbt-setup` / `gbt-uninstall` | Install or remove repository bootstrap configuration                                 |
| `gbt-patch`                   | Build, cache, and apply the patched esbuild binary                                   |

Examples from the repository root:

```sh
pnpm exec scope-affected --base main --head HEAD --list
pnpm exec scope-affected --changeset .changeset/example.md
pnpm exec scope-commit --staged --list
pnpm exec scope-commit --message docs "refresh workspace guide"
pnpm exec workspace-hook pre-commit
```

`scope-affected` defaults to CSV output and combines Nx-affected scopes with scopes from staged,
unstaged, and untracked repository files. `--nx-only` (or `--no-repo-scopes`) disables repository
scopes, while `--no-nx` disables Nx. `--changeset <file>` adds scopes from a changeset;
`--changeset-only <file>` uses only that file. Use `--keep-prefix` to retain full package names.

`scope-commit` defaults to staged changes. It also accepts `--all`, `--csv`, `--list`,
`--keep-prefix`, and `--validate-type <type>`. Message and mutation forms are
`--message <type> <subject>`, `--commit <type> <subject>`, and `--checked-commit <type> <subject>`;
commit forms also accept `--scope` and `--dry-run`.

### Branch-aware changeset workflow

The workflow branch is the durable state. `changeset/<slug>` and `release/<slug>` carry the commit
type and the slug for the life of the branch, so later commits still work after Changesets deletes
the original `.changeset/*.md` file. Scope is not stored on the branch: every commit recalculates it
from its own staged files.

```sh
pnpm exec gbt-changeset # create the changeset file, attach the branch, stop
git add .changeset/wacky-walker.md
pnpm exec gbt-workflow # read-only plan and the exact next actions
pnpm exec gbt-workflow commit "adjust generated output"
```

`gbt-changeset` creates exactly one changeset file and then creates or switches to its branch. It
does not stage, commit, push, or open a pull request — those are separate explicit steps.

`gbt-workflow` defaults to `plan`, which is strictly read-only: it reports the current branch or
detached HEAD, the inferred workflow (or why none is available), working-tree cleanliness, the
ancestry relationship to `origin/<base>`, whether a new branch here would be stacked, matching
workflow branches, and the available next actions. It never fetches, stages, or commits, so remote
facts come from the last fetched `refs/remotes/origin/*` state. `--json` emits the same plan as
data.

`gbt-workflow commit [text]` is the explicit mutation: it derives the type and slug from the current
workflow branch, resolves the scope from the currently staged files, appends optional text,
validates the message with Commitlint, and commits. It accepts `--scope`, `--keep-prefix`, and
`--dry-run`.

Pull-request creation, manual release preparation, and reconnect/recovery are tracked separately and
are not implemented by these commands yet.

## Environment

`workspaceEnvironment` is defined with node-utils' source-agnostic `defineEnv()` helper. Callers
provide the source explicitly; the schema applies validation and defaults.

| Variable                       | Role                                                 |
| ------------------------------ | ---------------------------------------------------- |
| `ALLOW_DIRTY`                  | Permit a dirty working tree in supported workflows   |
| `BASE_BRANCH`                  | Select the base branch                               |
| `COMMAND_NAME`                 | Identify the active command                          |
| `LOGGING`                      | Configure workspace logging behavior                 |
| `PACKAGE_MANAGER`              | Select npm or pnpm                                   |
| `GBT_PATCH_CWD`                | Override the patch command's working directory       |
| `PREFIX`, `PREFIX_OVERRIDE`    | Configure scope-name prefix handling                 |
| `PROTECTED_BRANCHES`           | Define branches protected from direct commit or push |
| `SCOPE_COMMIT_SKIP_COMMITLINT` | Skip commitlint in the scoped-commit workflow        |
| `SKIP_LINT_STAGED`             | Skip lint-staged in hook processing                  |

```ts
import { workspaceEnvironment } from '@snailicid3/workspace'

const environment = workspaceEnvironment.parse(process.env)
```

## Logger and bootstrap behavior

`@snailicid3/logger` owns the public `snail-sh` binary and its Zod-validated Node dispatcher.
Workspace hooks currently invoke that package binary so they share the same output. A small shell
logger remains only as the dependency-free bootstrap floor used before compiled package bins are
available; workspace no longer exports `snail-sh`.

## Removed and deferred commands

- `snail-package` was removed before publication and is not a compatibility contract.
- The temporary `inspect-dependencies` / `inspect-deps` Knip wrapper was removed. Dependency and
  export reporting belongs to the read-only Doctor rather than this package; its private MVP now
  handles the initial manifest/export/bin collectors.

## Release rehearsal

The shared candidate baseline is `68ab0564b2dc0f23b3ce3424beeb12225941c13d`. Workspace has no
registry release yet, so its rehearsal must choose a first publishable version, remove
`private: true` only as an intentional release change, and prove every installed bin in clean npm
and pnpm consumers. Publish node-utils first.

Before that rehearsal, reconcile `package.json#buildConfig.buildStrategy` with the actual tsc-only
build. The branch-aware workflow is not a release dependency: its automated tests pass, but the
maintainer has not manually exercised `gbt-workflow`'s read-only plan or its branch-derived commit
against a real remote.

## Development

Workspace is emitted with `tsc`; it does not use tsdown. Its Nx configuration removes the inferred
static `workspace -> config` tooling edge and lists the shared TypeScript configuration as a cache
input.

The current `package.json#buildConfig.buildStrategy` still says `bundle`, which does not match the
actual tsc-only Nx build. That is unregistered build-contract drift to reconcile before publication,
not an intentional Doctor fixture.

```sh
pnpm --filter=@snailicid3/workspace build:nx
pnpm --filter=@snailicid3/workspace test:nx
```
