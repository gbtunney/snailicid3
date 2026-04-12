# @snailicid3/build-config — Architecture

> **Status: Partially Implemented (Current + Target).**
>
> The adapter-based core in `src/build/` and `src/adapters/` is implemented and used now.
>
> Implemented now:
> - tool-agnostic build model (`BuildPlan`, `PackageIdentity`, `EntrySpec`)
> - adapter port (`BuildAdapter`)
> - adapter registry and selection logic
> - `none`, `tsc`, and `rollup` adapters
> - Rollup plugin presets + plan-to-rollup translation + exports map generation
>
> Not implemented yet:
> - dedicated `vite` and `esbuild` adapters in `src/adapters/`
> - typedoc/vitepress utility modules that were removed during migration
>
> See [`docs/PACKAGE_ANATOMY.md`](../../docs/PACKAGE_ANATOMY.md) for the vocabulary (runtime, product type,
> output format, build strategy) used throughout this document.

---

## 1. High-Level Goal

The repository uses a **tsc-first architecture** with optional bundler adapters.

Core principles:

- `tsc --build` is the baseline compilation step
- Bundlers such as Rollup, Vite, and esbuild are optional adapters
- Most packages should **not** require bundling
- Build planning must remain tool-agnostic

Architecture pattern:

```
BuildPlan → BuildPort → Adapter → Tool
```

Examples:

```
BuildPlan → RollupAdapter → Rollup config
BuildPlan → TscAdapter    → run tsc --build
```

---

## 2. Package Classification Model

Every package must define three core attributes.

### Runtime

Where the code executes.

| Value       | Rules                                                              |
|-------------|--------------------------------------------------------------------|
| `node`      | may use `fs`, `path`, `child_process`; may depend on Node APIs    |
| `browser`   | must not use Node builtins; must rely on browser APIs             |
| `universal` | must avoid Node-specific or DOM-specific APIs in the main entry   |
| `edge`      | targets edge/worker runtimes (Cloudflare Workers, Deno Deploy, …) |

### Product Type

Defines what the package represents.

```
library · cli · config · build_tool · plugin
web_app · server_app · worker · script
```

### Build Strategy

Defines how code is produced.

| Value       | Meaning                                                    |
|-------------|------------------------------------------------------------|
| `transpile` | TypeScript compilation via `tsc --build`                   |
| `bundle`    | Bundler (Rollup, Vite, esbuild)                            |
| `none`      | No compilation step — files shipped as-is                  |

---

## 3. Domain Model

The core build model must remain **tool-agnostic**.

```ts
// src/build/types.ts

export type Runtime =
  | 'node'
  | 'browser'
  | 'universal'
  | 'edge'

export type Product =
  | 'library'
  | 'cli'
  | 'config'
  | 'build_tool'
  | 'plugin'
  | 'web_app'
  | 'server_app'
  | 'worker'
  | 'script'

export type BuildStrategy =
  | 'transpile'
  | 'bundle'
  | 'none'

export interface PackageIdentity {
  runtime: Runtime
  product: Product
  buildStrategy: BuildStrategy
}

export type OutputKind =
  | 'esm'
  | 'cjs'
  | 'iife'
  | 'umd'

export interface EntrySpec {
  key: string           // maps to exports path or filename
  input?: string
  outputKinds: OutputKind[]
  banner?: boolean
  minify?: boolean
  sourcemap?: boolean
}

export interface BuildPlan {
  identity: PackageIdentity
  sourceDir: string
  outputDir: string
  entries: EntrySpec[]
}
```

This structure must remain **independent from Rollup, Vite, esbuild, and other tool-specific types**.

---

## 4. Build Port

All adapters implement a common interface.

```ts
// src/build/ports.ts

export interface BuildAdapter {
  name: string
  supports(runtime: Runtime, product: Product): boolean
  build(plan: BuildPlan): Promise<void>
  createConfig?(plan: BuildPlan): unknown
}
```

The core build system interacts only with this interface — never with Rollup or Vite types directly.

---

## 5. Adapter Implementations

Adapters live in:

```
packages/build-config/src/adapters/
  rollup/
  vite/
  esbuild/
  tsc/
  none/
```

Each adapter converts the generic `BuildPlan` into tool-specific configuration.

### tsc Adapter

Used for the majority of packages. Runs `tsc --build`. Produces compiled JS and `.d.ts` declarations.

### none Adapter

Used for packages with no build step (ESLint configs, JSON schemas, templates). Files are shipped as-is.

### esbuild Adapter

Used when:
- building CLI tools
- bundling Node scripts
- producing small, fast single-file bundles

> Review the existing esbuild config in the repo before implementing — it may contain relevant port
> configuration that should be preserved.

### Rollup Adapter

Used when:
- multiple output formats are needed (ESM + CJS, IIFE, UMD)
- browser library builds need controlled output

See [Rollup Plugin Strategy](#6-rollup-plugin-strategy) below.

### Vite Adapter

Used when:
- building browser libraries
- building web apps
- using React or other UI frameworks

---

## 6. Rollup Plugin Strategy

Plugin selection belongs inside the **Rollup adapter layer**. Plugin configuration must **not** live in the
generic `BuildPlan`.

Use **small named plugin presets** instead of a single giant configuration factory.

```ts
// src/adapters/rollup/plugins.ts

export type RollupPluginPreset =
  | 'node_library'
  | 'browser_library'
  | 'cli'
  | 'iife'
```

| Preset            | Plugins                                                         |
|-------------------|-----------------------------------------------------------------|
| `node_library`    | `nodeResolve`, `commonjs`, `json`                               |
| `browser_library` | `nodeResolve({ browser: true })`, optional `commonjs`, `json`   |
| `cli`             | `nodeResolve({ preferBuiltins: true })`, `commonjs`             |
| `iife`            | `nodeResolve({ browser: true })`, optional `commonjs`, `json`, optional `terser` |

### Historical reference

The old `snailicide-monorepo` package at
`packages/build-config/src/rollup` handled:

- plugin composition
- entry → output mapping
- banner generation from `package.json`
- multi-output builds
- filename generation

The new Rollup adapter should preserve:

- shared plugin presets
- banner helpers (generate from package metadata)
- simple entry → output planning

The new adapter should **not** recreate:

- the giant all-purpose Rollup config factory
- excessive plugin configurability
- core planning logic that depends on Rollup internals

---

## 7. Adapter Registry

```ts
// src/adapters/index.ts

export const adapters: BuildAdapter[] = [
  noneAdapter,
  rollupAdapter,
  tscAdapter,
]

export function selectAdapter(plan: BuildPlan): BuildAdapter | undefined {
  const { runtime, product, buildStrategy } = plan.identity

  if (buildStrategy === 'none') return noneAdapter
  if (buildStrategy === 'bundle') {
    const bundler = [rollupAdapter].find((adapter) =>
      adapter.supports(runtime, product),
    )
    if (bundler) return bundler
  }

  return adapters.find((adapter) => adapter.supports(runtime, product))
}
```

---

## 8. Default Build Policy

| Rule | Description |
|------|-------------|
| 1    | All packages must compile successfully with `tsc --build` |
| 2    | Bundlers should only be used when required |
| 3    | Default module format is **ESM** |
| 4    | Type declarations should come from `tsc` output |
| 5    | Packages should generally have a **single primary runtime** |

---

## 9. Target Folder Structure

```
packages/build-config/src/

build/
  types.ts      ← Runtime, Product, BuildStrategy, PackageIdentity, EntrySpec, BuildPlan
  plan.ts       ← BuildPlan helpers / constructors
  banner.ts     ← banner generation from package.json metadata
  ports.ts      ← BuildAdapter interface

adapters/
  rollup/
    index.ts
    plugins.ts  ← RollupPluginPreset + preset → plugin[] helper
    to-rollup.ts
  tsc/
    index.ts
  none/
    index.ts

vite/
  index.ts

vitest/
  index.ts

index.ts        ← public surface
```

---

## 10. Design Principles

**Keep:**
- tool-agnostic domain model (`BuildPlan`, `BuildAdapter`)
- tsc-first default
- adapter-scoped tool configuration
- small, named plugin presets

**Avoid:**
- hardcoding Rollup logic across the repo
- mixing domain planning with tool configuration
- giant build-config factories
- excessive override / config surface area

---

## 11. Future Extensions

Possible future adapters: `rspack`, `rolldown`, `bun build`, `tsup`.

Adding a new adapter should require **no changes to the existing domain model**.

---

## 12. Current Implementation Snapshot

The package currently exports and uses these APIs:

- Domain and helpers: `defineIdentity`, `defineEntry`, `definePlan`,
  `identityFromPackage`, `resolveEntryFilename`, `normaliseExportKey`
- Banner: `createBanner`
- Adapter selection: `adapters`, `selectAdapter`
- Adapters: `noneAdapter`, `tscAdapter`, `rollupAdapter`
- Rollup conversion: `toRollupConfig`, `toPackageExports`,
  `getPluginsForPreset`, `inferPreset`

This means the requested "bundle plugins and stuff" workflow is present for Rollup,
and package-level plans can already emit both ESM and CJS outputs.
