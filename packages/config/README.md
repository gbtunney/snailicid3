# @snailicid3/config 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/config)](https://www.npmjs.com/package/@snailicid3/config)
[![license](https://img.shields.io/npm/l/@snailicid3/config)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Shared linting, formatting, documentation, TypeScript, Nx, and API Extractor policy._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=1A2B34)](https://prettier.io/)
[![Nx](https://img.shields.io/badge/Nx-143055?style=for-the-badge&logo=nx&logoColor=white)](https://nx.dev/)

### Repository

- **GitHub:**
  [`@snailicid3/config`](https://github.com/gbtunney/snailicid3/tree/main/packages/config) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/config 🐌

---

Shared lint, formatting, documentation, TypeScript, Nx, and API Extractor policy for Snailicid3
projects.

> **Release status:** npm currently serves `@snailicid3/config@0.2.0`. The policy ownership and
> compatibility-wrapper changes in this checkout have not been released yet. Config is last in the
> four-package release rehearsal because its runtime dependency graph reaches node-utils, workspace,
> and logger.

## Ownership boundary

Config owns reusable policy and the generation of its published JSON configuration artifacts.
Generic JSON-file, path, and glob implementations belong to `@snailicid3/node-utils`; repository
facts and commands belong to `@snailicid3/workspace`; terminal output belongs to
`@snailicid3/logger`. Compatibility re-exports and command wrappers remain where consumers still
depend on the old config surface, but they delegate to the owning package.

## Included tooling

- [**eslint**](https://eslint.org/) • _Flat config with TypeScript, import, jsdoc, and sort rules_
- [**prettier**](https://prettier.io/) • _Shared Prettier options_
- [**markdownlint-cli2**](https://github.com/DavidAnson/markdownlint-cli2) • _Markdown linting
  rules_
- [**commitlint**](https://commitlint.js.org/) • _Conventional commit configuration_
- [**api-extractor**](https://api-extractor.com/) • _API report and declaration rollup config_
- [**typedoc**](https://typedoc.org/) • _TypeDoc config builders for standard, markdown, VitePress,
  and material-theme docs_
- [**typescript**](https://www.typescriptlang.org/) • _Base tsconfig presets: `base`, `library`,
  `typecheck`, `docs`_
- [**nx**](https://nx.dev/) • _Shared pipeline preset: `namedInputs` + `targetDefaults` consumed via
  `nx.json > extends`_

## Published entry points

| Entry                                        | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `@snailicid3/config`                         | JavaScript configuration builders and utilities |
| `@snailicid3/config/prettier`                | Generated Prettier JSON                         |
| `@snailicid3/config/markdownlint`            | Generated markdownlint JSON                     |
| `@snailicid3/config/nx-preset.json`          | Generated Nx preset                             |
| `@snailicid3/config/api-extractor/base.json` | Generated API Extractor base                    |
| `@snailicid3/config/tsconfig/*`              | TypeScript presets                              |

The package still exposes compatibility bins for `snail-sh`, workspace hooks, scoped commands,
changesets, setup, uninstall, and patching. The wrappers delegate according to package metadata;
logger owns `snail-sh` and workspace owns the repository-aware commands. A release must prove that
those wrappers resolve cleanly from installed registry packages, without workspace links or an
unpublished dependency.

## Installation

```sh
pnpm add --save-dev @snailicid3/config
```

## Examples

All TypeScript config builders require `cwd`. Pass `import.meta` from the config file when the
configuration should resolve paths relative to that file.

### ESLint

#### Basic Config

```ts
/* @file eslint.config.ts */
import { EsLint } from '@snailicid3/config'

const config = EsLint.config({ cwd: import.meta })

export default EsLint.defineConfig(config)
```

#### Overriding Config

This example appends an extra ignore pattern.

```ts
/* @file eslint.config.ts */
import { EsLint } from '@snailicid3/config'

const config = EsLint.config({
  cwd: import.meta,
  ignores: ['packages/**/docs/**/*'],
})

export default EsLint.defineConfig(config)
```

#### Overriding Rules

This example appends a custom flat-config entry.

```ts
/* @file eslint.config.ts */
import { EsLint, type EsLintConfig, expandExtensions, TS_FILE_EXTENSIONS } from '@snailicid3/config'

const overrideExample: EsLintConfig[number] = {
  /** Expands a list of file extensions by appending them to a normalized base pattern. */
  files: expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/*'),
  name: 'Naming: allow ids for parameters',
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        custom: {
          match: true,
          regex: '^([a-zA-Z][a-zA-Z0-9_]{2,}|id|db|fs|ctx|req|res)$',
        },
        format: ['camelCase'],
        selector: 'parameter',
      },
    ],
  },
}

const config = EsLint.config({ cwd: import.meta, overrides: [overrideExample] })

export default EsLint.defineConfig(config)
```

### Prettier

#### Standard Config

```ts
/* @file prettier.config.ts */
import { Prettier } from '@snailicid3/config'

export default Prettier.defineConfig(Prettier.config({ cwd: import.meta }))
```

#### Overriding Config

```ts
/* @file prettier.config.ts */
import { Prettier } from '@snailicid3/config'

export default Prettier.defineConfig(
  Prettier.config({
    cwd: import.meta,
    options: {
      endOfLine: 'lf',
      printWidth: 100,
      semi: false,
      singleQuote: true,
      tabWidth: 4,
      trailingComma: 'all',
    },
    overrides: [
      {
        files: '**/*.json',
        options: {
          tabWidth: 4,
        },
      },
    ],
  }),
)
```

#### JSON File Config

Use `configFile` when generating a `.prettierrc.json` artifact. It keeps plugins as package-name
strings instead of resolved plugin objects.

```ts
import { Prettier } from '@snailicid3/config'

const prettierrc = Prettier.configFile({ cwd: import.meta })
```

### Markdownlint

```ts
/* @file .markdownlint-cli2.mts */
import { Markdownlint } from '@snailicid3/config'

export default Markdownlint.defineConfig(Markdownlint.config({ cwd: import.meta }))
```

### Nx

The shared pipeline ships as a generated `dist/nx-preset.json`, consumed through Nx's `extends`:

```jsonc
/* @file nx.json */
{
  "extends": "@snailicid3/config/nx-preset.json",
  "nxCloudId": "…",
  "analytics": true,
}
```

Nx merges a preset with a **top-level shallow spread**, so a consumer `nx.json` must not redefine
`namedInputs` or `targetDefaults` — either would replace the preset's wholesale. Per-package
variance belongs in `package.json > nx.targets`.

`build` is deliberately bundler-agnostic (`dependsOn: ["build:ts"]`), so each package opts into its
own bundler, otherwise it compiles types but never emits `dist`:

```jsonc
/* @file packages/<name>/package.json */
"nx": { "targets": { "build": { "dependsOn": ["build:ts", "build:tsdown"] } } }
```

Workspace-root targets are namespaced `root:*` to avoid colliding with package targets. Enable them
from the root `package.json` — no `project.json` required:

```jsonc
/* @file package.json */
"nx": {
    "targets": {
        "root:build": {}, "root:build:ts": {},
        "root:clean": {}, "root:clean:ts": {},
        "root:lint": {}, "root:fix": {},
        "lint:md": {}, "fix:md": {}
    }
}
```

The preset is also available programmatically, which is how this repo renders its own committed
`nx.json` rather than extending an artifact produced by building itself:

```ts
import { Nx } from '@snailicid3/config'

const preset = Nx.config({ cwd: process.cwd() }) // { namedInputs, targetDefaults }
```

### Lint-Staged

```ts
/* @file .lintstagedrc.mts */
import { LintStaged } from '@snailicid3/config'

export default LintStaged.defineConfig(LintStaged.config({ cwd: import.meta }))
```

### Commitlint

```ts
/* @file commitlint.config.ts */
import { Commitlint } from '@snailicid3/config'

export default Commitlint.defineConfig(
  Commitlint.config({
    cwd: import.meta,
    scopeOptions: {
      mergeScopes: ['my-package'],
      matchers: {
        docs: ['docs/**', '**/*.md'],
        actions: null,
      },
    },
  }),
)
```

`scopeOptions.matchers` maps a commit scope to micromatch glob patterns used by both `scope-commit`
and `scope-affected`. A configured key replaces that scope's built-in patterns; set it to `null` to
disable the built-in mapping. Unspecified defaults remain enabled for `actions`, `notes`, and
`scripts`.

### Git workflow environment

Husky delegates lint-staged, commit-message, filename, branch-name, and protected-branch checks to
the `workspace-hook` Node dispatcher. Workspace environment defaults are defined by its Zod schema:

```sh
pnpm run commit:direct -- "message" # sets SKIP_LINT_STAGED=true
SKIP_LINT_STAGED=true git commit -m "chore(root): message"
PROTECTED_BRANCHES=main,master,release pnpm run commit:feat -- "message"
```

`SKIP_LINT_STAGED` defaults to `false`. `PROTECTED_BRANCHES` defaults to the exact branch names
`main,master`; set it to an empty value to disable branch protection.

### TypeDoc

```ts
/* @file typedoc.config.ts */
import { Typedoc } from '@snailicid3/config'

export default Typedoc.materialTheme.config({ cwd: import.meta })
```

```ts
/* @file typedoc.config.ts */
import { Typedoc } from '@snailicid3/config'

export default Typedoc.markdown.config({ cwd: import.meta })
```

```ts
/* @file typedoc.config.ts */
import { Typedoc } from '@snailicid3/config'

export default Typedoc.vitepress.config({ cwd: import.meta })
```

### Api-Extractor

Generate or copy the package base config to `dist/.api-extractor-base.json`, then extend it from the
package API Extractor config.

```json5
{
  extends: './dist/.api-extractor-base.json',
}
```

The TypeScript builder has the same required `cwd` contract.

```ts
import { ApiExtractor } from '@snailicid3/config'

const config = ApiExtractor.config({ cwd: import.meta })
```

### TypeScript

#### Type Check

Does not emit js files, checks all files in package including .test.ts files.

```json5
// @file tsconfig.json
{
  extends: '@snailicid3/config/tsconfig.typecheck',
  exclude: ['./node_modules'],
  files: ['package.json'],
  include: [
    './*.ts',
    './*.cts',
    './*.mts',
    './src/**/*.ts',
    './src/**/*.cts',
    './src/**/*.mts',
    './**/*.test.ts',
    './**/*.test.mts',
    './**/*.test.cts',
  ],
}
```

#### Library

Creates a folder of declarations and js files in `<configDir>/types`, suitable for a library
package.

```json5
/* @file tsconfig.build.json */
{
  extends: '@snailicid3/config/tsconfig.library',
  include: ['./src/**/*.ts', './src/**/*.cts', './src/**/*.mts'],
  exclude: ['**/*.test.ts', '**/*.test.mts', '**/*.test.cts'],
}
```

Change `outDir` to `<configDir>/dist` if not using a bundler. This example overrides the
compilerOptions to create a dist folder of js files.

```json5
/* @file tsconfig.build.json */
{
  extends: '@snailicid3/config/tsconfig.library',
  include: ['./src/**/*.ts', './src/**/*.cts', './src/**/*.mts'],
  exclude: ['**/*.test.ts', '**/*.test.mts', '**/*.test.cts'],
  compilerOptions: {
    outDir: './dist',
  },
}
```

## Shell Completions

The shell completion install helper can be called through pnpm:

```sh
pnpm exec gbt-setup
```

## Release rehearsal

The shared candidate baseline is `68ab0564b2dc0f23b3ce3424beeb12225941c13d`. Release config after
node-utils, workspace, and logger are resolvable from the isolated registry. The clean-consumer
checks must verify:

- every exported generated JSON file exists in the packed artifact and matches the source policy
- every TypeScript-config subpath resolves from npm and pnpm installations
- compatibility command wrappers reach the installed logger/workspace binaries
- no `workspace:*` dependency is rewritten to an unavailable registry package
- the root JavaScript entry loads without relying on monorepo symlinks

The generated files are public API. `build-exporter.ts` may be replaced only together with another
artifact-generation mechanism; deleting it as cleanup would break published entry points.

## Development

```sh
pnpm --filter=@snailicid3/config build:nx
pnpm --filter=@snailicid3/config test:nx
pnpm --filter=@snailicid3/config api:report:nx
```
