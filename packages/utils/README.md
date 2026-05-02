# @snailicid3/utils 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/utils)](http://www.npmjs.com/package/@snailicid3/utils)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/utils)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_String, numeric, object, date, and formatting utility functions._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Zod](https://img.shields.io/badge/zod-%233068b7.svg?style=for-the-badge&logo=zod&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:** [`@snailicid3/utils`](https://github.com/gbtunney/snailicid3/tree/main/packages/utils) • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)
- **CDN**: [jsdeliver](https://cdn.jsdelivr.net/npm/@snailicid3/utils/dist/index.min.js)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/utils 🐌

---

This package provides a wide range of general-purpose utility functions for string manipulation, numeric operations, object transformations, date formatting, and pretty-printing. It runs in any JavaScript environment.

### `@snailicid3/utils` _contains:_

- **String utilities** — case conversion, truncation, template formatting with `sprintf`
- **Numeric utilities** — range mapping, rounding, parsing, step ranges
- **Object utilities** — deep merge, flatten, pick, omit
- **Date utilities** — formatting and parsing via `dayjs`
- **Format utilities** — pretty-print, template literals (`fmt`)
- **Glob utilities** — pattern matching via `minimatch`
- **Semver utilities** — version parsing and comparison via `semver`

## Installation

```sh
#pnpm
$ pnpm add @snailicid3/utils

#yarn
$ yarn add @snailicid3/utils

#npm
$ npm install @snailicid3/utils
```

## Examples

### String & Format

```ts
import { fmt } from '@snailicid3/utils'

const msg = fmt`Hello ${'world'}!`
console.log(msg) // 'Hello world!'
```

### Numeric

```ts
import { mapRange, roundToDecimals } from '@snailicid3/utils'

mapRange(0.5, [0, 1], [0, 100]) // 50
roundToDecimals(3.14159, 2)     // 3.14
```
