# @snailicid3/workspace 🐌

Workspace discovery, repository operations, scope resolution, and repository-aware CLI commands.

## Commands

- `scope-commit` and `scope-affected` resolve changed paths to workspace scopes.
- `workspace-hook` dispatches the Husky pre-commit, commit-msg, and pre-push workflows.
- `gbt-changeset`, `gbt-exec`, `gbt-setup`, `gbt-uninstall`, and `gbt-patch` retain the existing
  repository bootstrap behavior.
- `inspect-dependencies` and its `inspect-deps` alias are transitional; their reporting will
  ultimately move to doctor.

`snail-package` was removed before publication. Package-manager selection and execution are exposed
as ordinary workspace functions, and Husky calls `workspace-hook` directly.

## Environment

`workspaceEnvironment` is defined with node-utils' source-agnostic `defineEnv()` helper. Defaults
and validation live in its Zod schema, and callers explicitly supply `process.env`,
`import.meta.env`, or another record:

```ts
import { workspaceEnvironment } from '@snailicid3/workspace'

const environment = workspaceEnvironment.parse(process.env)
```

## Logging migration note

The existing `snail-sh` presentation is intentionally retained for now because its colorful rules,
sections, status messages, and key/value output are useful and pleasant to read. Its long-term owner
is `@snailicid3/logger`. When it moves, preserve the current visual character and command behavior;
do not replace it with unformatted output while deduplicating the shell and TypeScript logger paths.

## Build and Nx

Workspace is emitted with `tsc`; it does not use tsdown. It extends config's shared TypeScript files
for tooling only, so its Nx configuration removes the inferred `workspace -> config` project edge
and lists `packages/config/typescript-config/**/*` as a build/typecheck cache input.
