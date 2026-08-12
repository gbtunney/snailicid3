# @snailicid3/workspace 🐌

Workspace discovery, repository operations, scope resolution, and repository-aware CLI commands.

> Workspace is temporarily private while its public contract is under construction, so feature PRs
> are not classified as pending releases. Restore its publishable version and `private: false`
> before packed-consumer and release validation; public config artifacts must not retain a private
> workspace dependency.

## Commands

- `scope-commit` and `scope-affected` resolve changed paths to workspace scopes.
- `workspace-hook` dispatches the Husky pre-commit, commit-msg, and pre-push workflows.
- `gbt-changeset`, `gbt-exec`, `gbt-setup`, `gbt-uninstall`, and `gbt-patch` retain the existing
  repository bootstrap behavior.

Dependency inspection is intentionally deferred to the Doctor phase. The temporary
`inspect-dependencies`/`inspect-deps` Knip wrapper was removed rather than preserving an API that
Doctor will replace.

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

`@snailicid3/logger` now owns the public `snail-sh` binary and its schema-validated Node dispatcher.
The shell implementation remains here only as the dependency-free bootstrap floor while setup runs
before compiled package bins are available; it is no longer exported as workspace's `snail-sh` bin.

## Build and Nx

Workspace is emitted with `tsc`; it does not use tsdown. It extends config's shared TypeScript files
for tooling only, so its Nx configuration removes the inferred `workspace -> config` project edge
and lists `packages/config/typescript-config/**/*` as a build/typecheck cache input.
