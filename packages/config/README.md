# @snailicid3/config 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/config)](http://www.npmjs.com/package/@snailicid3/config)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/config)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Shared ESLint, Prettier, markdownlint, commitlint, and TypeScript base configurations for the
snailicid3 monorepo._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:**
  [`@snailicid3/config`](https://github.com/gbtunney/snailicid3/tree/main/packages/config) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3.git)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/config 🐌

---

This package provides shareable configuration files for common tooling used across the snailicid3
monorepo. It includes ESLint flat configs, Prettier options, markdownlint rules, commitlint
conventions, TypeScript base configs, and utility shell scripts.

### `@snailicid3/config` _contains:_

- [**eslint**](https://eslint.org/) • _Flat config with TypeScript, import, jsdoc, and sort rules_
- [**prettier**](https://prettier.io/) • _Shared Prettier options_
- [**markdownlint-cli2**](https://github.com/DavidAnson/markdownlint-cli2) • _Markdown linting
  rules_
- [**commitlint**](https://commitlint.js.org/) • _Conventional commit configuration_
- [**api-extractor**](https://api-extractor.com/) • _API report and declaration rollup config_
- [**typedoc**](https://typedoc.org/) • _TypeDoc config builders for standard, markdown,
  VitePress, and material-theme docs_
- [**typescript**](https://www.typescriptlang.org/) • _Base tsconfig presets: `base`, `library`,
  `typecheck`, `docs`_

## Installation

```sh
#pnpm
$ pnpm add @snailicid3/config -D

#yarn
$ yarn add @snailicid3/config -D

#npm
$ npm install @snailicid3/config --save-dev
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
    scopeOptions: { mergeScopes: ['my-package'] },
  }),
)
```

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

Creates a folder of declarations and js files in `<configDir>/types`, suitable for a library package.

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
