# @snailicid3/build-config 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/build-config)](https://www.npmjs.com/package/@snailicid3/build-config)
[![license](https://img.shields.io/npm/l/@snailicid3/build-config)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Provides reusable build plans and config factories for tsdown, Vite, and Vitest._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![tsdown](https://img.shields.io/badge/tsdown-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://tsdown.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

### Repository

- **GitHub:**
  [`@snailicid3/build-config`](https://github.com/gbtunney/snailicid3/tree/main/packages/build-config)
  • [`snailicid3`](https://github.com/gbtunney/snailicid3)
- **Documentation**: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/build-config 🐌

---

This package is a small config factory. You describe a package or its entry points once, and the
factories return ordinary tsdown, Vite and Vitest configuration objects that each tool accepts
directly. Native options remain available as overrides, so the wrappers add typing and shared
defaults rather than hiding the tools behind an exhaustive schema.

The factories return configuration and nothing else. They do not run builds, start servers, rewrite
`package.json`, or make network calls — tool CLIs and Nx targets perform execution.

**Building does not validate the package.** Publint, ATTW and unused-dependency scanning are package
validation and belong to Doctor, which runs them explicitly against source or packed artifacts. A
build that emits correct artifacts should not fail for a reason the build did not cause.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design specification.

### Focused subpaths

Import one adapter without loading the others:

```ts
import { defineTsdownConfig, toTsdownConfigs } from '@snailicid3/build-config/tsdown'
import { toViteConfig } from '@snailicid3/build-config/vite'
import { vitest } from '@snailicid3/build-config/vitest'
import { defineBuildPlan } from '@snailicid3/build-config/plan'
import { createBanner } from '@snailicid3/build-config/banner'
```

The root entry still re-exports the common factories for existing consumers.

`vitest` is an optional peer dependency: it is only needed when you import the Vitest subpath.

### `@snailicid3/build-config` _contains:_

#### Build Adapters

- [**tsdown**](https://tsdown.dev/) • _Primary bundler for TypeScript libraries (ESM + CJS)_
- [**vite**](https://vitejs.dev/) • _Web app and browser library bundler_

#### Vitest Configuration

- [**vitest**](https://vitest.dev/) • _Shared vitest configuration with coverage_

#### Banner and plan helpers

- _Banner generation from `packageIdentitySchema`, and pure build-plan/export-plan derivation_

## Installation

```sh
pnpm add --save-dev @snailicid3/build-config
```

## Examples

### tsdown Config

```ts
/* @file tsdown.config.ts */
import { defineBuildPlan, toTsdownConfigs } from '@snailicid3/build-config'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const plan = defineBuildPlan(pkg, {
  entries: [
    {
      banner: true,
      exports: true,
      key: '*',
      output_formats: ['esm', 'cjs', 'ts'],
      runtime: 'node',
    },
  ],
  root: {
    outputDir: './dist',
    sourceDir: './src',
  },
})

export default defineConfig(toTsdownConfigs(plan))
```

### Vitest Config

```ts
/* @file vitest.config.ts */
import { vitest } from '@snailicid3/build-config/vitest'
export default vitest.config()
```

### Deriving package.json exports from a build plan

```ts
import { defineBuildPlan, toPackageExportsPlan } from '@snailicid3/build-config'
import pkg from './package.json' with { type: 'json' }

const plan = defineBuildPlan(pkg, {
  entries: [
    {
      exports: true,
      key: '*',
      output_formats: ['esm', 'cjs', 'ts'],
    },
  ],
})

console.log(toPackageExportsPlan(plan))
// {
//   '.': {
//     types: './dist/index.d.ts',
//     import: './dist/index.js',
//     require: './dist/index.cjs',
//     default: './dist/index.js'
//   }
// }
```

## Vite Config

Todo
