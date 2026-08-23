# Snailicid3 monorepo 🐌

> ESM-first TypeScript libraries, shared configuration, and repository tooling under the
> `@snailicid3` scope.

[![Push Main](https://github.com/gbtunney/snailicid3/actions/workflows/push-main.yml/badge.svg)](https://github.com/gbtunney/snailicid3/actions/workflows/push-main.yml)

Snailicid3 is a pnpm workspace orchestrated by Nx. Public packages provide focused library and
tooling surfaces; private projects hold repository-specific commands, templates, and experiments.

## Packages

| Package                                                       | Release state              | Purpose                                                                   |
| ------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| [`@snailicid3/config`](./packages/config)                     | Published                  | ESLint, Prettier, markdownlint, commitlint, Nx, and TypeScript config     |
| [`@snailicid3/build-config`](./packages/build-config)         | Published                  | Narrow tsdown, Vite, and Vitest config factories and package banners      |
| [`@snailicid3/types`](./packages/types)                       | Published                  | TypeScript utility types and type guards                                  |
| [`@snailicid3/utils`](./packages/utils)                       | Published                  | Runtime-neutral string, numeric, object, date, and formatting utilities   |
| [`@snailicid3/color`](./packages/color)                       | Published                  | Color parsing, conversion, manipulation, and hex utilities                |
| [`@snailicid3/node-utils`](./packages/node-utils)             | Published                  | Node.js filesystem, path, environment, argv, and process utilities        |
| [`@snailicid3/logger`](./packages/logger)                     | Published; changes pending | Structured logging, terminal presentation, tables, spinners, and shell UI |
| [`@snailicid3/cli-app`](./packages/cli-app)                   | Published                  | Zod-backed CLI application and parsing framework                          |
| [`@snailicid3/workspace`](./packages/workspace)               | Public; release pending    | Workspace discovery, repository operations, scoped commits, and hooks     |
| [`@snailicid3/storybook-config`](./packages/storybook-config) | Public; release pending    | Shared Storybook configuration                                            |
| [`@snailicid3/doctor`](./packages/doctor)                     | Private MVP                | Read-only package, export, artifact, and fixture diagnostics              |
| [`@snailicid3/example-package`](./packages/example-package)   | Private                    | Example package and intentional Doctor fixture                            |

The registry's current logger release is `@snailicid3/logger@0.0.6`. The implementation and
ownership work in this checkout is complete but not yet released; the next release still needs its
changeset/version decision and clean external-consumer proof.

## Apps

| App                               | Status  | Purpose                |
| --------------------------------- | ------- | ---------------------- |
| [`playground`](./apps/playground) | Private | Development playground |

## Requirements

- Node.js `>=22.12.0`
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

The current package-surface candidate is tracked in
[#232](https://github.com/gbtunney/snailicid3/pull/232). After it merges, record the exact candidate
SHA in [#222](https://github.com/gbtunney/snailicid3/issues/222) and rehearse the cohort in
dependency order:

1. `@snailicid3/types`
2. `@snailicid3/utils`
3. `@snailicid3/color` and `@snailicid3/node-utils`
4. `@snailicid3/logger`
5. `@snailicid3/workspace`
6. `@snailicid3/config`, `@snailicid3/build-config`, and `@snailicid3/cli-app`
7. `@snailicid3/storybook-config`

Publish that cohort only to an isolated local registry first, then exercise clean npm and pnpm
consumers against installed tarballs rather than workspace links. Changeset/version decisions,
real-registry publication, consumer updates, and GitHub Actions adoption remain separate steps.

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
registered findings. The executable registry in `packages/doctor/src/fixtures.ts` is authoritative:
it currently covers the busted exports in `@snailicid3/example-package`. Logger's repaired
declaration-routing fixture is retired; its API, packed-declaration, and runtime-intent diagnostic
codes remain reserved for future collectors.

Do not fix a registered fixture as drive-by cleanup. Doctor must report it without mutating the
package. API-report, packed-declaration, runtime-intent, Nx, Publint, ATTW, and Knip collectors
remain later Doctor slices. Export problems not listed in the registry remain ordinary defects.
