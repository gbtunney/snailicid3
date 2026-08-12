# @snailicid3/node-utils 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/node-utils)](http://www.npmjs.com/package/@snailicid3/node-utils)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/node-utils)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Node.js filesystem, path, glob, and package.json utilities._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:**
  [`@snailicid3/node-utils`](https://github.com/gbtunney/snailicid3/tree/main/packages/node-utils) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3.git)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/node-utils 🐌

---

This package provides Node.js-specific utilities for filesystem operations, path resolution, glob
pattern matching, and reading/validating `package.json` files. It targets Node.js runtime only.

### `@snailicid3/node-utils` _contains:_

- **Filesystem utilities** — file existence checks, directory traversal, reading files
- **Path utilities** — path resolution, normalization, relative/absolute conversions
- **Glob utilities** — pattern matching via `glob` and `is-glob`
- **Package.json utilities** — reading and validating workspace `package.json` files
- **CLI argument parsing** — via `yargs` integration

## Installation

```sh
#pnpm
$ pnpm add @snailicid3/node-utils

#yarn
$ yarn add @snailicid3/node-utils

#npm
$ npm install @snailicid3/node-utils
```

## Lightweight typed argument parsing

Use `parseArgv` when a script needs typed command-line arguments without the application, generated
help, or interactive behavior provided by `@snailicid3/cli-app`:

```ts
import { parseArgv } from '@snailicid3/node-utils'
import { hideBin } from 'yargs/helpers'
import { z } from 'zod'

const schema = z.object({
  count: z.coerce.number().int().default(1),
  dryRun: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
})

const args = parseArgv(schema, hideBin(process.argv))
```

Repeated options become arrays, so `-z gbt -z gbt2` can be validated with `z.array(z.string())`. Raw
option values remain strings; use schemas such as `z.coerce.number()` to control conversion.

- `parseArgv(schema, argv)` returns the schema's typed and transformed output, or throws a
  `ZodError`.
- `safeParseArgv(schema, argv)` returns Zod's discriminated success/error result.

Both functions support field-level and root-object transforms because they pass the parsed argument
object directly to Zod without inspecting the schema.

## Repository maintenance: shared config and the Nx graph

`node-utils` and `build-config` extend TypeScript configuration files published by
`@snailicid3/config`. That is a static tooling relationship, not a runtime or build-order dependency
on the config package. Their `package.json` files therefore remove Nx's inferred config edge with:

```json
{
  "nx": {
    "implicitDependencies": ["!@snailicid3/config"]
  }
}
```

Without that exception, Nx infers the false cycle `config -> node-utils -> build-config -> config`.
The relevant build and typecheck targets still list
`{workspaceRoot}/packages/config/typescript-config/**/*` as an input, so changes to the shared
TypeScript configuration invalidate their Nx cache entries. The workspace root does not need this
exception because Nx does not infer a root-to-config project dependency.
