<!-- @snailicid3:header:start -->

# @snailicid3/build-config

> Shared rollup, vite, vitest and typedoc build tool configs

<!-- @snailicid3:header:end -->

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the intended design of this package
— the tsc-first, adapter-based build system it is being refactored toward.

## What Is Implemented Now

The adapter-based core is already implemented.

- Tool-agnostic build model in `src/build`:
  - identity and plan types
  - plan helper functions
  - package metadata banner generation
- Adapter port in `src/build/ports.ts`
- Working adapters in `src/adapters`:
  - `none` adapter for no-build config/script packages
  - `tsc` adapter for transpile-only package builds
  - `rollup` adapter for bundle builds (supports ESM/CJS/IIFE/UMD outputs)
- Rollup helpers:
  - plugin presets (`node_library`, `browser_library`, `cli`, `iife`)
  - `toRollupConfig(plan, libraryName, packageMeta?)`
  - `toPackageExports(plan)` for generating `package.json#exports`

## Minimal Example

```ts
import {
  defineEntry,
  defineIdentity,
  definePlan,
  toPackageExports,
  toRollupConfig,
} from '@snailicid3/build-config'

const plan = definePlan(
  defineIdentity('node', 'library', 'bundle'),
  './src',
  './dist',
  [defineEntry('.', ['esm', 'cjs'], { banner: true, sourcemap: true })],
)

const rollupConfig = toRollupConfig(plan, 'myLibrary')
const exportsMap = toPackageExports(plan)
```

`exportsMap` for the plan above:

```json
{
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  }
}
```

## Current Gaps

- `vite` and `esbuild` adapter implementations are not present yet under
  `src/adapters`
- typedoc/vitepress utilities from the previous repo are still intentionally not
  re-added

## Installation

```sh
pnpm add @snailicid3/build-config
```
