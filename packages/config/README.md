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

### ESLint

#### Example: Basic Config

```ts
/* @file eslint.config.ts */
import { EsLint } from '@snailicid3/config'
import url from 'node:url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const CONFIG = EsLint.config(__dirname)

export default EsLint.defineConfig(CONFIG)
```

#### Example: Overriding Config

This overrides eslint config to ignore everything in package docs foldders

```ts
import { EsLint,EslintConfig } from '@snailicid3/config'
import url from 'node:url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const override_example:EslintConfig=
const CONFIG:EslintConfig[] = [...EsLint.config(__dirname),
    { ignores: ['packages/**/docs/**/*'],}
]
export default EsLint.defineConfig(CONFIG)

```

#### Example: Overriding Rules

This overrides eslint config to add or change default rules. This example shows how to add camelcase
naming convention to specific files.

```ts
import { EsLint, EslintConfig, expandExtensions, TS_FILE_EXTENSIONS } from '@snailicid3/config'
import url from 'node:url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const override_example: EslintConfig = {
  /** Expands a list of file extensions by appending them to a normalized base pattern. */
  files: expandExtensions(TS_FILE_EXTENSIONS, '**/src/**/*'),
  name: 'Naming: allow ids for paramaters',
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

const CONFIG: EslintConfig[] = [...EsLint.config(__dirname), override_example]
export default EsLint.defineConfig(CONFIG)
```

### Prettier

#### Example: Standard Config

Does not emit js files, checks all files in package including .test.ts files

```ts
/** @file Prettier.config.ts */
import { Prettier } from '@snailicid3/config'
export default Prettier.configuration()
```

#### Example: Standard Config

```ts
/* @file prettier.config.ts */
//TODO update after refactor with defineConfig function
import { Prettier } from '@snailicid3/config'
import type { Config as PrettierConfig } from 'prettier'

const configOption: PrettierConfig = {
  endOfLine: 'lf',
  printWidth: 100,
  semi: false,
  singleQuote: true,
  tabWidth: 4,
  trailingComma: 'all',
}

const overrides = [
  {
    files: '**/*.json',
    options: {
      tabWidth: 4,
    },
  },
]

export default Prettier.configuration(
  true,
  {
    endOfLine: 'lf',
    printWidth: 100,
    semi: false,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'all',
  },
  overrides,
)
```

### TypeScript

#### Example: Type Check

Does not emit js files, checks all files in package including .test.ts files

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

```json5
{}
```

#### Example: Library

Creates a folder of declarations & js files in `<configDir>/types`, suitable for a library package.

```json5
/* @file tsconfig.build.json */
{
  extends: '@snailicid3/config/tsconfig.library',
  include: ['./src/**/*.ts', './src/**/*.cts', './src/**/*.mts'],
  exclude: ['**/*.test.ts', '**/*.test.mts', '**/*.test.cts'],
}
```

Change outDir to `<configDir>/dist` if not using a bundler this example overrides the
compilerOptions to create dist folder of js files.

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

### Commitlint

```ts
/* @file commitlint.config.ts */
import { commitlint } from '@snailicid3/config'

export default commitlint.configuration(['root', 'my-package'])
```

## Shell Completions

The shell completion install helper can be called through pnpm:

```sh
pnpm exec gbt-setup
```
