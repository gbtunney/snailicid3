# Snailicid3 monorepo 🐌

> ESM-first TypeScript libraries, shared configuration, and repository tooling under the
> `@snailicid3` scope.

[![Push Main](https://github.com/gbtunney/snailicid3/actions/workflows/push-main.yml/badge.svg)](https://github.com/gbtunney/snailicid3/actions/workflows/push-main.yml)

Snailicid3 is a pnpm workspace orchestrated by Nx. Public packages provide focused library and
tooling surfaces; private projects hold repository-specific commands, templates, and experiments.

## Packages

| Package                                                     | Release state              | Purpose                                                                   |
| ----------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| [`@snailicid3/config`](./packages/config)                   | Published                  | ESLint, Prettier, markdownlint, commitlint, Nx, and TypeScript config     |
| [`@snailicid3/build-config`](./packages/build-config)       | Published                  | Shared tsdown, Vite, Vitest, and TypeDoc build-tool configuration         |
| [`@snailicid3/types`](./packages/types)                     | Published                  | TypeScript utility types and type guards                                  |
| [`@snailicid3/utils`](./packages/utils)                     | Published                  | Runtime-neutral string, numeric, object, date, and formatting utilities   |
| [`@snailicid3/color`](./packages/color)                     | Published                  | Color parsing, conversion, manipulation, and hex utilities                |
| [`@snailicid3/node-utils`](./packages/node-utils)           | Published                  | Node.js filesystem, path, environment, argv, and process utilities        |
| [`@snailicid3/logger`](./packages/logger)                   | Published; changes pending | Structured logging, terminal presentation, tables, spinners, and shell UI |
| [`@snailicid3/cli-app`](./packages/cli-app)                 | Published                  | Zod-backed CLI application and parsing framework                          |
| [`@snailicid3/workspace`](./packages/workspace)             | Private                    | Workspace discovery, repository operations, scoped commits, and hooks     |
| [`@snailicid3/doctor`](./packages/doctor)                   | Private MVP                | Read-only package, export, artifact, and fixture diagnostics              |
| [`@snailicid3/example-package`](./packages/example-package) | Private                    | Example package and intentional Doctor fixture                            |

The registry's current logger release is `@snailicid3/logger@0.0.6`. The implementation and
ownership work in this checkout is complete but not yet released; the next release still needs its
changeset/version decision and clean external-consumer proof.

## Apps

| App                               | Status  | Purpose                |
| --------------------------------- | ------- | ---------------------- |
| [`playground`](./apps/playground) | Private | Development playground |

## Requirements

- Node.js `>=20.0.0`
- pnpm `>=10.30.2 <11` (`pnpm@10.30.2` is pinned in `package.json`)

## Getting started

Run commands from the repository root:

```sh
pnpm install
pnpm --filter=@snailicid3/root build
```

## Common commands

| Task                | Command                                     |
| ------------------- | ------------------------------------------- |
| Build the workspace | `pnpm --filter=@snailicid3/root build`      |
| Run all tests       | `pnpm --filter=@snailicid3/root test`       |
| Run lint checks     | `pnpm --filter=@snailicid3/root check`      |
| Apply lint fixes    | `pnpm --filter=@snailicid3/root fix`        |
| Check Markdown      | `pnpm --filter=@snailicid3/root check:md`   |
| Build API docs      | `pnpm --filter=@snailicid3/root docs:build` |
| Check API reports   | `pnpm --filter=@snailicid3/root api:check`  |
| Open the Nx graph   | `pnpm --filter=@snailicid3/root inspect:nx` |

Target one package through its workspace name:

```sh
pnpm --filter=@snailicid3/logger build:nx
pnpm --filter=@snailicid3/logger test:nx
```

## Release rehearsal

The four-package release-test baseline is `main` at `68ab0564b2dc0f23b3ce3424beeb12225941c13d`.
Rehearse the dependency cohort in this order:

1. `@snailicid3/node-utils`
2. `@snailicid3/workspace` and `@snailicid3/logger`
3. `@snailicid3/config`

Config is last because its runtime dependency graph reaches the other three packages. Record the
exact candidate SHA, make the changeset/version decisions, publish to an isolated local registry,
and exercise clean npm and pnpm consumers against installed packages rather than workspace links.
The complete matrix and expected Doctor findings are tracked in
[the architecture/refactor plan](./notes/snailicid3-architecture-and-refactor-plan.md#113-four-package-release-rehearsal-baseline).

The new TypeScript changeset workflow has automated unit and temp-git coverage, but it has not yet
been manually rehearsed. Do not wire it to the public bin or use its mutating path for this cohort
until the read-only plan and opt-in `--apply` behavior have been tried in a disposable repository.

## Repository layout

```text
apps/       Private runnable applications
docs/       Architecture and setup references
packages/   Public libraries and private workspace packages
scripts/    Root maintenance and generation scripts
```

Package-level READMEs are the source of truth for installation, entry points, examples, and package
status. Root orchestration lives in `package.json` and shared Nx target defaults live in `nx.json`.

## Doctor fixtures

Some package and export inconsistencies are deliberately retained so the read-only Doctor can be
developed against real, reproducible failures. The private `@snailicid3/doctor@0.0.0` MVP now
discovers npm/pnpm packages, reports manifest/export/bin evidence, emits text or JSON, and labels
the initial example/logger export findings. The fixture registry in the
[architecture/refactor plan](./notes/snailicid3-architecture-and-refactor-plan.md) is authoritative:
currently it covers the busted exports in `@snailicid3/example-package` and selected declaration,
packaging, and runtime-intent drift in `@snailicid3/logger`.

Do not fix a registered fixture as drive-by cleanup. Doctor must report it without mutating the
package. API-report, packed-declaration, runtime-intent, Nx, Publint, ATTW, and Knip collectors
remain later Doctor slices. Export problems not listed in the registry remain ordinary defects.
