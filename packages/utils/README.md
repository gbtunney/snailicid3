# @snailicid3/utils 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/utils)](https://www.npmjs.com/package/@snailicid3/utils)
[![license](https://img.shields.io/npm/l/@snailicid3/utils)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_String, numeric, object, date, and formatting utility functions._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)

### Repository

- **GitHub:** [`@snailicid3/utils`](https://github.com/gbtunney/snailicid3/tree/main/packages/utils)
  • [`snailicid3`](https://github.com/gbtunney/snailicid3)
- **CDN:** [jsDelivr](https://cdn.jsdelivr.net/npm/@snailicid3/utils/dist/index.min.js)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/utils 🐌

---

This package provides a wide range of general-purpose utility functions for string manipulation,
numeric operations, object transformations, date formatting, and pretty-printing. It runs in any
JavaScript environment.

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
pnpm add @snailicid3/utils
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
roundToDecimals(3.14159, 2) // 3.14
```
