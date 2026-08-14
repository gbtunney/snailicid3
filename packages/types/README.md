# @snailicid3/types 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/types)](https://www.npmjs.com/package/@snailicid3/types)
[![license](https://img.shields.io/npm/l/@snailicid3/types)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Pure TypeScript types, utility types, and typeguard functions._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

### Repository

- **GitHub:** [`@snailicid3/types`](https://github.com/gbtunney/snailicid3/tree/main/packages/types)
  • [`snailicid3`](https://github.com/gbtunney/snailicid3)
- **CDN:** [jsDelivr](https://cdn.jsdelivr.net/npm/@snailicid3/types/dist/index.min.js)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/types 🐌

---

This package provides foundational TypeScript type definitions, utility types, and runtime typeguard
functions. It has no runtime dependencies beyond `ramda` and `type-fest` and is safe to use in any
environment.

### `@snailicid3/types` _contains:_

- **Utility types** — `Falsy`, `NilOrEmpty`, `NilLike`, `Nullish`, `Primitive`, `PlainObject`,
  `EmptyString` and more
- **JSON types** — typed JSON value, object, and array types
- **Typeguards** — `tg.isTruthy`, `tg.isFalsy`, `tg.isNilOrEmpty`, `tg.isNotNilOrEmpty`,
  `tg.guardToAssertion`, `tg.predicateToAssertion`

## Installation

```sh
pnpm add @snailicid3/types
```

## Examples

### Typeguards

```ts
import { tg } from '@snailicid3/types'

tg.isTruthy(0) // false
tg.isTruthy('hello') // true

tg.isNilOrEmpty(null) // true
tg.isNilOrEmpty([]) // true
tg.isNilOrEmpty([1]) // false

const assertIsString = tg.guardToAssertion((v: unknown): v is string => typeof v === 'string')
assertIsString('ok') // passes
assertIsString(42) // throws TypeError
```
