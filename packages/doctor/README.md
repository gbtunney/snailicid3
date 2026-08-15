# @snailicid3/doctor 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/doctor)](https://www.npmjs.com/package/@snailicid3/doctor)
[![license](https://img.shields.io/npm/l/@snailicid3/doctor)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Read-only package and artifact diagnostics for npm and pnpm workspaces._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

### Repository

- **GitHub:**
  [`@snailicid3/doctor`](https://github.com/gbtunney/snailicid3/tree/main/packages/doctor) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/doctor 🐌

---

> **MVP status:** this package is private at `0.0.0`. It is an implementation workspace, not a
> release candidate. The first slice reports manifest/export/bin reality and labels the retained
> example-package export fixture; it does not fix files or enforce CI policy.

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

The executable registry contains the retained example fixture and three reserved logger fixture IDs.
This MVP produces and regression-tests:

- `EXP-EXAMPLE-001` when the example package has a declared export target missing from observed
  artifacts

Logger's former `EXP-LOGGER-001` declaration-routing fixture was retired when the package export
conditions were repaired in #232.

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
