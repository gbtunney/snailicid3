# @snailicid3/config 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/config)](http://www.npmjs.com/package/@snailicid3/config)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/config)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Shared ESLint, Prettier, markdownlint, commitlint, and TypeScript base
configurations for the snailicid3 monorepo._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:**
  [`@snailicid3/config`](https://github.com/gbtunney/snailicid3/tree/main/packages/config)
  • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/config 🐌

---

This package provides shareable configuration files for common tooling used
across the snailicid3 monorepo. It includes ESLint flat configs, Prettier
options, markdownlint rules, commitlint conventions, TypeScript base configs,
and utility shell scripts.

### `@snailicid3/config` _contains:_

- [**eslint**](https://eslint.org/) • _Flat config with TypeScript, import,
  jsdoc, and sort rules_
- [**prettier**](https://prettier.io/) • _Shared Prettier options_
- [**markdownlint-cli2**](https://github.com/DavidAnson/markdownlint-cli2) •
  _Markdown linting rules_
- [**commitlint**](https://commitlint.js.org/) • _Conventional commit
  configuration_
- [**typescript**](https://www.typescriptlang.org/) • _Base tsconfig presets:
  `base`, `library`, `typecheck`, `docs`_

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

```ts
/* @file eslint.config.ts */
import { EsLint } from '@snailicid3/config'

const FLAT_CONFIG = await EsLint.flatConfig()

export default [
  ...FLAT_CONFIG,
  {
    ignores: ['packages/**/docs/**/*'],
  },
]
```

### Prettier

```json5
/* @file package.json */
{
  prettier: '@snailicid3/config/prettier',
}
```

### TypeScript

```json5
/* @file tsconfig.json */
{
  extends: '@snailicid3/config/tsconfig/typecheck',
  include: ['**/*.ts'],
  exclude: ['node_modules'],
}
```

### Commitlint

```ts
/* @file commitlint.config.ts */
import { commitlint } from '@snailicid3/config'

export default commitlint.configuration(['root', 'my-package'])
```

## Shell Completions

The shell helper can be called through pnpm:

```sh
pnpm exec snail-sh line "-|" "50%" bg-cyan
```

Bash:

```sh
source ./node_modules/@snailicid3/config/completions/snail-sh.bash
```

For completions while still running through pnpm, add a small wrapper:

```sh
snail-sh() { pnpm exec snail-sh "$@"; }
```
