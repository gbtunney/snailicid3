# @snailicid3/doctor 🐌

Read-only package and artifact diagnostics for npm and pnpm workspaces.

> **MVP status:** this package is private at `0.0.0`. It is an implementation workspace, not a
> release candidate. The first slice reports manifest/export/bin reality and labels the first two
> registered export fixtures; it does not fix files or enforce CI policy.

## Principles

- package-first: a single non-Nx package is a valid input
- read-only: collectors and reporters do not mutate manifests or artifacts
- evidence-first: every finding has a stable code and observed paths or routing details
- fixtures are labels: known findings remain visible and unregistered findings are not suppressed
- reporting is non-enforcing: findings exit successfully; only operational failures exit non-zero

## Current collectors

| Diagnostic code                  | Observation                                                      |
| -------------------------------- | ---------------------------------------------------------------- |
| `MANIFEST_READ_ERROR`            | Missing, unreadable, non-object, or invalid package manifest     |
| `MANIFEST_NAME_MISSING`          | Missing or empty package name                                    |
| `EXPORT_TARGET_INVALID`          | Non-relative or package-escaping export target                   |
| `EXPORT_TARGET_MISSING`          | Declared concrete export target absent from the package tree     |
| `EXPORT_TYPES_CONDITION_MISSING` | Legacy `types` target exists without a root export `types` route |
| `LEGACY_TARGET_MISSING`          | Missing `main`, `module`, or `types` target                      |
| `BIN_TARGET_MISSING`             | Declared executable target is absent                             |
| `BIN_TARGET_NOT_EXECUTABLE`      | Declared executable lacks an executable mode on POSIX            |

Workspace discovery first asks `@snailicid3/workspace` for npm/pnpm package facts. If that command
is unavailable or incompatible, Doctor falls back to a bounded manifest scan while ignoring common
dependency, build, documentation, and coverage directories. Nx is not required.

## Usage

Build the private package, then run its installed-style bin:

```sh
pnpm --filter=@snailicid3/doctor build:nx
node packages/doctor/dist/cli.js .
```

Limit a report to named packages or request machine-readable output:

```sh
node packages/doctor/dist/cli.js . \
  --package @snailicid3/example-package \
  --package @snailicid3/logger

node packages/doctor/dist/cli.js . --json
```

The library entry exposes `runDoctor()`, individual discovery/manifest collectors, report
formatters, the diagnostic model, and the executable fixture registry.

## Fixture coverage

The executable registry contains all five fixture IDs from the architecture plan. This MVP produces
and regression-tests:

- `EXP-EXAMPLE-001` when the example package has a declared export target missing from observed
  artifacts
- `EXP-LOGGER-001` when logger's root export omits an explicit `types` condition

The API forgotten-export, packed-declaration, and runtime-intent codes are reserved but their
collectors are not implemented yet. A reserved code does not count as coverage and does not hide the
underlying package state.

## Next slices

1. Compare build-plan expectations with emitted and packed exports, including wildcard routes.
2. Inspect API reports for supporting public symbols that the root does not export.
3. Inspect actual tarball contents for competing declaration surfaces.
4. Compare runtime intent with the emitted dependency graph.
5. Add optional Nx target/graph enrichment.
6. Integrate Publint, ATTW, and Knip as read-only collectors.
7. Add a separate validate severity policy only after Doctor reports are trustworthy.

## Development

```sh
pnpm --filter=@snailicid3/doctor build:nx
pnpm --filter=@snailicid3/doctor test:nx
```
