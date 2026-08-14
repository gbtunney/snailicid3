# @snailicid3/node-utils 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/node-utils)](https://www.npmjs.com/package/@snailicid3/node-utils)
[![license](https://img.shields.io/npm/l/@snailicid3/node-utils)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Node.js filesystem, path, JSON, environment, process, and lightweight argv utilities._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)

### Repository

- **GitHub:**
  [`@snailicid3/node-utils`](https://github.com/gbtunney/snailicid3/tree/main/packages/node-utils) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/node-utils 🐌

---

Node-specific filesystem, path, JSON-file, environment, command, and lightweight argv utilities.

> **Release status:** npm currently serves `@snailicid3/node-utils@0.1.0`. The ownership changes in
> this checkout have not been released yet and are part of the four-package release rehearsal.

## Installation

```sh
pnpm add @snailicid3/node-utils
```

The package exposes one ESM/CommonJS root entry and `./package.json`.

## Ownership boundary

Node-utils owns reusable Node primitives: file IO, path classification, glob filtering, process
execution, environment parsing, entrypoint detection, and small argv normalization. It does not own
repository policy, Git state, package scopes, or release workflows; those belong to
`@snailicid3/workspace`. Runtime-neutral JSON value behavior belongs to `@snailicid3/utils`, while
presentation belongs to `@snailicid3/logger`.

## API groups

| Area                | Representative exports                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Argument parsing    | `parseArgv`, `safeParseArgv`, `parseArgvObject`, `parseArgvPositionals`                          |
| Environment         | `defineEnv`, `getEnvironmentReportRows`, `reportEnvironment`                                     |
| Commands            | `runCommand`, `runCommandOrThrow`                                                                |
| CLI entrypoints     | `isCallerEntrypoint`, `runCliIfEntrypoint`, `runCliIfEntrypointAsync`                            |
| JSON and objects    | `json`, `deepMerge`, `isPlainObject`, JSON guards and branded serialization                      |
| Filesystem and path | `paths`, `filePath`, `typedPath`, `fsPath`, `fsTypedPath`, path classifiers and existence checks |
| Globs and media     | `filterFileArrByGlob`, `getImageBase64`                                                          |

## Typed argument parsing

Use separate Zod schemas when a command has named options and positional arguments:

```ts
import { parseArgv } from '@snailicid3/node-utils'
import { hideBin } from 'yargs/helpers'
import { z } from 'zod'

const options = z.object({
  dryRun: z.boolean().default(false),
  tag: z.array(z.string()).default([]),
})
const positionals = z.tuple([z.string()])

const args = parseArgv(options, hideBin(process.argv), positionals)

console.log(args.options.dryRun, args.positionals[0])
```

Yargs performs token normalization without numeric coercion; the Zod schema controls coercion and
transforms. Repeated options become arrays. `safeParseArgv()` returns a discriminated result instead
of throwing a `ZodError`.

## Typed environments

Environment definitions do not read `process.env` implicitly. Pass a source to `parse()` so library
code and tests stay deterministic:

```ts
import { defineEnv, getEnvironmentReportRows } from '@snailicid3/node-utils'
import { z } from 'zod'

const environment = defineEnv({
  logLevel: z.enum(['debug', 'info']).default('info'),
  token: z.string().meta({ sensitive: true }),
})

const values = environment.parse(process.env)
const safeRows = getEnvironmentReportRows(environment, process.env)
```

Property names become uppercase underscore-separated environment keys unless a schema supplies
`meta({ environmentKey: '...' })`. Values marked sensitive—and names that look credential-like—are
redacted in reports.

## Compatibility notes

- `node.exportJSONFile` is a deprecated alias for `json.exportFile`.
- Config retains compatibility re-exports for JSON-file and path helpers whose implementation now
  lives here.
- `file.path.array.ts#getFullPath` and `path.ts#getFullPath` still have different semantics. Their
  consolidation is deliberately deferred until callers and filesystem-schema behavior are proved.

## Release rehearsal

The shared candidate baseline is `68ab0564b2dc0f23b3ce3424beeb12225941c13d`. Node-utils is first in
the release-test dependency order. Pack the candidate, load its installed root through ESM and
CommonJS, verify declaration routing, and exercise the argv, path, JSON-file, and environment
surfaces from clean npm and pnpm consumers. The residual `getFullPath` duplication is a
semantics-sensitive follow-up, not a registered Doctor fixture.

The Doctor MVP currently reports the root export map's missing explicit `types` condition as an
**unregistered** finding. Unlike the deliberately retained example/logger fixtures, that is a
release-gate defect to resolve or explicitly reclassify before rehearsing node-utils.

## Repository maintenance

Node-utils extends TypeScript configuration published by `@snailicid3/config`. That is a static
tooling relationship rather than a runtime dependency, so the package removes Nx's inferred config
edge with `implicitDependencies: ["!@snailicid3/config"]`. Its build and typecheck targets still
include the shared TypeScript-config directory as a cache input.

```sh
pnpm --filter=@snailicid3/node-utils build:nx
pnpm --filter=@snailicid3/node-utils test:nx
pnpm --filter=@snailicid3/node-utils api:report:nx
```
