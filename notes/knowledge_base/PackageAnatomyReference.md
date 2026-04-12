# Package Anatomy Reference

A framework for reasoning about packages across four independent axes: **runtime** (where code executes),
**product type** (what the package is for), **output format** (how the artifact is emitted), and **build
strategy** (how the artifact is produced). Keeping these axes distinct prevents confusion when making build,
publish, and deployment decisions. They are orthogonal - any combination is possible, and conflating them is
the source of most packaging confusion.

-

## Table of Contents

- [Definitions](#definitions)
- [Core Axes](#core-axes)
  - [Runtime](#runtime)
  - [Product Type](#product-type)
  - [Output / Module Format](#output-module-format)
  - [Build Strategy](#build-strategy)
- [Packaging and Delivery](#packaging-and-delivery)
  - [Public Packages Are Not Always Libraries](#public-packages-are-not-always-libraries)
  - [The exports Field](#the-exports-field)
  - [Release vs Publish vs Deploy](#release-vs-publish-vs-deploy)
  - [Unbundled Builds Are Valid](#unbundled-builds-are-valid)
  - [Dev Runners Are Not Output Formats](#dev-runners-are-not-output-formats)
- [Advanced Notes](#advanced-notes)
  - [Mixed Runtimes in One Package](#mixed-runtimes-in-one-package)
  - [Environment Configuration Layers](#environment-configuration-layers)
  - [Generated Docs Delivery](#generated-docs-delivery)
- [Reference](#reference)
  - [Practical Classification Table](#practical-classification-table)
  - [Example Classifications](#example-classifications)
  - [Rule of Thumb](#rule-of-thumb)

-

## Definitions

- **Runtime**: _Describes the environment where code executes - the host that provides globals, APIs, and
  constraints._
- **Product Type**: _Describes what the package **is for** - how it is consumed or invoked by its users._
- **Output / Module Format**: _Describes how the built artifact is **emitted** - the file format and module
  system used by the compiled output._
- **Build Strategy**: _Describes **how the artifact is produced** - whether the source is transpiled directly,
  bundled by a tool, or shipped as-is._

-

## Core Axes

### Runtime

> **_"Where does this code execute?"_**

**Runtime** is the environment that hosts the running code. It determines which globals and APIs are
available.

- **`node`** - _can use `node:path`, `fs`, `process`, sockets, server APIs_
- **`browser`** - _can use `window`, `document`, DOM, `fetch`, `localStorage`_
- **`edge / worker`** - _server-side-ish but not full Node; usually no `fs`, often no raw TCP, different
  globals_
- **`neutral / universal`** - _intended to run in multiple runtimes; avoids runtime-specific APIs or isolates
  them behind adapters_

> **Key idea**: `runtime: browser` must not depend on Node built-ins like `fs`, `path`, `child_process`.
> `runtime: node` - Node APIs are allowed.

-

### Product Type

> **_"What is this package for?"_**

**Product type** describes how the package is consumed or invoked.

- **library** - _meant to be imported by other code_
- **cli** - _meant to be executed as a command_
- **web-app** - _browser application or site_
- **server-app** - _API server or backend service_
- **worker** - _background process, queue worker, or cron-like runner_
- **plugin** - _extension for another tool, framework, or bundler_
- **config package** - _shared config consumed by tools; usually not runtime code_
- **build tool / codegen tool** - _invoked during development or build_
- **script / automation** - _one-off or internal runnable code_
- **component library** - _UI components_
- **SDK / client** - _wrapper around an API or platform_

#### Examples

- **React component package** - `library`, runtime `browser` or `universal`
- **Express server** - `server-app`, runtime `node`
- **`bin` in `package.json`** - usually indicates a `cli`
- **Vite React app** - `web-app`, runtime `browser`
- **Google Apps Script package** - `script`, targeting a platform-specific runtime

-

### Output / Module Format

> **_"How is the built artifact emitted?"_**

**Output format** is independent of runtime. The same runtime can support multiple formats; the same format
can target multiple runtimes.

- **`esm`** - _ES Module; `import` / `export` syntax_
- **`cjs`** - _CommonJS; `require` / `module.exports`_
- **`iife`** - _Immediately Invoked Function Expression; browser drop-in scripts_
- **`umd`** - _Universal Module Definition; works in both browser and Node environments_
- **unbundled JS** - _emitted directly from `tsc`; module structure stays intact_

> **Note**: _Output format is not the same as runtime._ Node can consume `esm` or `cjs`. Browsers often use
> `esm` for libraries and `iife` for drop-in scripts. CLIs typically ship `esm` or `cjs`.

-

### Build Strategy

> **_"How is the artifact produced?"_**

**Build strategy** describes the process used to produce the output artifact. It is decided before choosing a
specific tool - the strategy drives tool selection, not the other way around.

- **`transpile`** - _TypeScript compiled directly to JavaScript via `tsc -build`; module structure stays
  intact; no bundling_
- **`bundle`** - _source files combined and transformed by a bundler such as Rollup, Vite, or esbuild;
  required when multiple output formats, tree-shaking, or browser-optimised output is needed_
- **`none`** - _no build step; files are shipped as-is; typical for JSON schemas, plain config files, or
  templates_

#### Examples

- **type utility library** - `transpile`; `tsc` is sufficient, no bundler needed
- **browser CDN drop-in** - `bundle`; needs `iife` output and minification
- **ESLint config package** - `none`; JavaScript or JSON files shipped directly
- **CLI tool** - `transpile` or `bundle`; `tsc` often sufficient, esbuild if single-file output is preferred
- **React component library** - `bundle`; Vite or Rollup for ESM output with optional tree-shaking

> **Note**: _Build strategy is independent of output format. A `transpile` build can still emit `esm` or
> `cjs`. A `bundle` step is not required just because multiple formats are needed - but it is required when
> the output must be browser-optimised, minified, or consolidated into a single file._

-

## Packaging and Delivery

### Public Packages Are Not Always Libraries

Publishing to npm does **not** automatically mean something is a library. Public npm packages can be
libraries, CLIs, config packages, scaffolding tools, build tools, SDKs, or plugins.

Example - a CLI published to npm:

```json
{
  "bin": {
    "my-tool": "./dist/bin.js"
  }
}
```

The package is **published**, but its product type is **`cli`**, not `library`.

-

### The exports Field

The `exports` field in `package.json` is where runtime, product type, and output format intersect in practice.
It controls which files consumers can import and allows different entrypoints per condition.

A simple library with a single ESM output:

```json
{
  "exports": {
    ".": "./dist/index.js"
  }
}
```

A package with separate Node and browser entrypoints:

```json
{
  "exports": {
    ".": {
      "node": "./dist/index.node.js",
      "browser": "./dist/index.browser.js",
      "default": "./dist/index.js"
    }
  }
}
```

A package exposing both ESM and CJS:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

> **Note**: _Conditions are matched top-to-bottom. `default` should always be last._ Bundlers and runtimes
> respect different condition sets - `node`, `browser`, `import`, `require`, `development`, `production` are
> all valid but tooling support varies.

-

### Release vs Publish vs Deploy

These are distinct operations that are often conflated.

| Term        | Meaning                                         |
| ----------- | ----------------------------------------------- |
| **release** | Version tag or changelog milestone              |
| **publish** | Push artifact somewhere others can consume it   |
| **deploy**  | Run an application or service in an environment |

#### Examples by Product Type

| Product Type                   | Release                  | Publish                  | Deploy (code)                 | Deploy (docs)                                       |
| ------------------------------ | ------------------------ | ------------------------ | ----------------------------- | --------------------------------------------------- |
| **library**                    | `v1.2.0` tag             | npm                      | none                          | optional - static hosting if docs site is generated |
| **cli**                        | tag                      | npm                      | none                          | rarely                                              |
| **web-app**                    | Git tag / GitHub release | build artifact           | static hosting / CDN          | N/A                                                 |
| **server-app**                 | tag                      | Docker image or artifact | server / container / platform | rarely                                              |
| **internal workspace package** | repo versioning only     | none                     | not applicable                | none                                                |

> **Note**: _A library's code artifact is never deployed, but its generated docs (e.g. TypeDoc to HTML) are
> web content and may have their own deploy step - separate from npm publish - to static hosting such as
> GitHub Pages, Netlify, or a shared host. This docs deploy path is independent of the code release._

-

### Unbundled Builds Are Valid

A package can be built with only:

```sh
tsc -build
```

This means TypeScript compiles `.ts` to `.js`, `.d.ts` files are emitted, and the module structure stays
mostly intact. Consumers import compiled files directly.

This approach is often ideal for:

- **Node libraries**
- **internal workspace packages**
- **tools and CLIs**
- **config packages**

> **Note**: _Bundling is not required just because a package exists._

-

### Dev Runners Are Not Output Formats

Tools like `tsx` and `ts-node` execute TypeScript directly during development. They are **not** distribution
formats and should not appear in published artifacts.

```sh
# Development - runs TypeScript directly
tsx src/bin.ts

# Build - compiles to JavaScript
tsc -build

# Published artifact - compiled JS only
dist/index.js
```

- **`tsx`** - _dev execution tool; not shipped_
- **`dist/index.js`** - _the actual published artifact_

-

## Advanced Notes

### Mixed Runtimes in One Package

Technically possible, but often messy. A split like `./node` and `./browser` entrypoints increases complexity
across conditional exports, build logic, testing matrix, accidental cross-imports, and type confusion.

Most projects follow a simpler rule:

> **one package - one primary runtime**, possibly multiple output formats.

-

### Environment Configuration Layers

Environment configuration can exist at multiple layers, each with a distinct responsibility.

- **Root workspace**: _shared TypeScript base config, shared lint config, shared build helpers, common
  scripts_
- **Package level**: _runtime intent, exports, build configuration, dependencies_
- **Entrypoint level**: _runtime-specific outputs, environment overrides_
- **Deployment environment**: _dev / staging / production variables, secrets_

Typical pattern: root defines defaults - package declares intent - entrypoints override when necessary.

-

### Generated Docs Delivery

Libraries that generate documentation (e.g. TypeDoc, TSDoc) produce a **secondary artifact** - web content

- that is entirely separate from the code artifact published to npm. This docs artifact has its own delivery
  concerns.

Common patterns:

- **Committed to repo** - TypeDoc generates markdown into `docs/` and it is committed. Always in sync, but
  produces noisy diffs and git history churn. Particularly painful in monorepos where every version bump
  cascades into walls of generated diff.
- **Gitignored and hosted** - Output is gitignored; a CI step builds and deploys to static hosting (GitHub
  Pages, Netlify, Bluehost). Clean repo, but docs live separately from code and require a deploy pipeline.
- **Not generated** - No docs site; consumers read source or types directly. Zero overhead.
- **CI-only** - Never committed, never in the working tree. Built and deployed as part of the release pipeline
  only.

> **Key idea**: _If docs are generated as HTML or a Vite-served site, they are web content - not part of the
> npm artifact - and need their own hosting decision. "Deploy: no" for a library refers to the code only._

-

## Reference

### Practical Classification Table

| Runtime   | Product Type        | Build Strategy      | Typical Output          | Typical Build  | Release          | Publish              | Deploy (code) | Deploy (docs) | `d.ts` bundled?  |
| --------- | ------------------- | ------------------- | ----------------------- | -------------- | ---------------- | -------------------- | ------------- | ------------- | ---------------- |
| `node`    | library             | transpile           | esm, sometimes cjs      | tsc or Rollup  | tag              | npm optional         | no            | optional      | usually no       |
| `browser` | library             | bundle              | esm, sometimes iife/umd | Vite or Rollup | tag              | npm                  | no            | optional      | usually no       |
| `browser` | component library   | bundle              | esm                     | Vite / Rollup  | tag              | npm                  | no            | optional      | sometimes        |
| `node`    | cli                 | transpile or bundle | esm or cjs + bin        | tsc or esbuild | tag              | npm                  | no            | rarely        | rarely important |
| `browser` | web-app             | bundle              | browser assets          | Vite           | tag / GH release | artifact             | yes           | N/A           | N/A              |
| `node`    | server-app          | transpile or bundle | runnable JS             | tsc or esbuild | tag              | artifact / container | yes           | rarely        | N/A              |
| `node`    | build tool          | transpile           | esm / cjs               | tsc            | tag              | npm sometimes        | no            | rarely        | no               |
| `node`    | config package      | none                | JS / JSON               | none or tsc    | tag              | npm sometimes        | no            | no            | minimal          |
| `edge`    | worker / serverless | bundle              | esm                     | esbuild / Vite | tag              | artifact / platform  | yes           | rarely        | rare             |

> **Note**: _Deploy (docs) refers to generated doc sites (e.g. TypeDoc to HTML). See
> [Generated Docs Delivery](#generated-docs-delivery)._

-

### Example Classifications

#### Node Library - generic / `@snailicid3/node-utils`

- **runtime**: node
- **product**: library
- **build strategy**: transpile
- **build**: `tsc` or Rollup
- **publish**: npm optional
- **deploy (code)**: none
- **deploy (docs)**: optional - TypeDoc to static hosting if docs site is generated

#### Type-Only Library - generic / `@snailicid3/types`

- **runtime**: universal
- **product**: library
- **build strategy**: transpile
- **build**: `tsc`
- **publish**: npm optional
- **deploy (code)**: none
- **deploy (docs)**: rarely - type-only packages seldom have a standalone docs site

#### CLI Tool - generic / `@snailicid3/cli-app` / `@snailicid3/workspace-tools`

- **runtime**: node
- **product**: CLI or build tool
- **build strategy**: transpile or bundle
- **build**: `tsc`
- **publish**: npm (via `bin`)
- **deploy (code)**: none
- **deploy (docs)**: rarely

#### React Component Library - generic / `@myorg/ui`

- **runtime**: browser or universal
- **product**: component library
- **build strategy**: bundle
- **build**: Vite or Rollup
- **publish**: npm
- **deploy (code)**: none
- **deploy (docs)**: optional - Storybook or TypeDoc site often hosted separately

#### React App (Vite) - generic / `apps/web`

- **runtime**: browser
- **product**: web-app
- **build strategy**: bundle
- **build**: Vite
- **publish**: build artifact
- **deploy**: yes

#### API Server - generic / `apps/api`

- **runtime**: node
- **product**: server-app
- **build strategy**: transpile or bundle
- **build**: `tsc` / esbuild
- **publish**: Docker image or artifact
- **deploy**: yes

#### Platform Script - Google Apps Script / `apps/gas`

- **runtime**: platform-specific
- **product**: script / app
- **build strategy**: bundle
- **build**: host-specific bundle
- **deploy**: platform deployment

-

### Rule of Thumb

> **_"Ask these questions in order."_**

1. **Where does it run?** - `node` / `browser` / `edge` / `universal`
1. **How is it used?** - library / CLI / deployed app / config / tool
1. **How is it produced?** - `transpile` / `bundle` / `none`
1. **How is it shipped?** - npm / artifact / container / static files / internal
1. **Does it actually need bundling?** - _Often the answer is **no**._

Answering these usually removes most of the confusion.
