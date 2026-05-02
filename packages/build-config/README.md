# @snailicid3/build-config 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/build-config)](http://www.npmjs.com/package/@snailicid3/build-config)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/build-config)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Provides reusable build configurations and adapters for tsdown, vite, vitest, and typedoc._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Zod](https://img.shields.io/badge/zod-%233068b7.svg?style=for-the-badge&logo=zod&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:** [`@snailicid3/build-config`](https://github.com/gbtunney/snailicid3/tree/main/packages/build-config) • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)
- **Documentation**: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/build-config 🐌

---

This package provides a tool-agnostic build planning system with adapter implementations for tsdown, vite, esbuild, rollup, and tsc. It defines a `BuildPlan` abstraction so package build identity (runtime, product, build strategy) is declared once in `package.json` and consumed by all build configs.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design specification.

### `@snailicid3/build-config` _contains:_

#### Build Adapters

- [**tsdown**](https://tsdown.dev/) • _Primary bundler for TypeScript libraries (ESM + CJS)_
- [**vite**](https://vitejs.dev/) • _Web app and browser library bundler_
- [**esbuild**](https://esbuild.github.io/) • _Single-file script bundler_
- [**rollup**](https://rollupjs.org/) • _Available as an adapter for multi-format builds_
- [**tsc**](https://www.typescriptlang.org/) • _Transpile-only adapter_

#### Vitest Configuration

- [**vitest**](https://vitest.dev/) • _Shared vitest configuration with coverage_

#### TypeDoc Configuration

- [**typedoc**](https://typedoc.org/) • _Documentation generator for TypeScript_
- [**typedoc-plugin-markdown**](https://typedoc-plugin-markdown.org/) • _Generate docs as markdown_
- [**typedoc-material-theme**](https://github.com/nicholasgasior/typedoc-material-theme) • _Material theme for TypeDoc_

## Installation

```sh
#pnpm
$ pnpm add @snailicid3/build-config -D

#yarn
$ yarn add @snailicid3/build-config -D

#npm
$ npm install @snailicid3/build-config --save-dev
```

## Examples

### tsdown Config

```ts
/* @file tsdown.config.ts */
import {
    defineEntry,
    definePlan,
    identityFromPackage,
    toTsdownConfig,
} from '@snailicid3/build-config'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const identity = identityFromPackage(pkg)

const plan = definePlan(identity, './src', './dist', [
    defineEntry('.', ['esm', 'cjs'], {
        banner: true,
        dts: true,
        sourcemap: true,
    }),
])

export default defineConfig(toTsdownConfig(plan))
```

### Vitest Config

```ts
/* @file vitest.config.ts */
import { vitest } from '@snailicid3/build-config'
export default vitest.config()
```

### TypeDoc Config

```ts
/* @file typedoc.config.ts */
import { typedoc } from '@snailicid3/build-config'
import url from 'node:url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export default typedoc.configMaterialTheme(__dirname, {})
```

### Deriving package.json exports from a build plan

```ts
import { defineEntry, definePlan, identityFromPackage, toPackageExports } from '@snailicid3/build-config'
import pkg from './package.json' with { type: 'json' }

const plan = definePlan(identityFromPackage(pkg), './src', './dist', [
    defineEntry('.', ['esm', 'cjs'], { dts: true }),
])

console.log(toPackageExports(plan))
// {
//   '.': {
//     types: './dist/index.d.ts',
//     import: './dist/index.js',
//     require: './dist/index.cjs',
//     default: './dist/index.js'
//   }
// }
```
