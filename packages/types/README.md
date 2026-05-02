# @snailicid3/types 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/types)](http://www.npmjs.com/package/@snailicid3/types)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/types)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Pure TypeScript types, utility types, and typeguard functions._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:** [`@snailicid3/types`](https://github.com/gbtunney/snailicid3/tree/main/packages/types) • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)
- **CDN**: [jsdeliver](https://cdn.jsdelivr.net/npm/@snailicid3/types/dist/index.min.js)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/types 🐌

---

This package provides foundational TypeScript type definitions, utility types, and runtime typeguard functions. It has no runtime dependencies beyond `ramda` and `type-fest` and is safe to use in any environment.

### `@snailicid3/types` _contains:_

- **Utility types** — `Falsy`, `NilOrEmpty`, `NilLike`, `Nullish`, `Primitive`, `PlainObject`, `EmptyString` and more
- **JSON types** — typed JSON value, object, and array types
- **Typeguards** — `tg.isTruthy`, `tg.isFalsy`, `tg.isNilOrEmpty`, `tg.isNotNilOrEmpty`, `tg.guardToAssertion`, `tg.predicateToAssertion`

## Installation

```sh
#pnpm
$ pnpm add @snailicid3/types

#yarn
$ yarn add @snailicid3/types

#npm
$ npm install @snailicid3/types
```

## Examples

### Typeguards

```ts
import { tg } from '@snailicid3/types'

tg.isTruthy(0)        // false
tg.isTruthy('hello')  // true

tg.isNilOrEmpty(null) // true
tg.isNilOrEmpty([])   // true
tg.isNilOrEmpty([1])  // false

const assertIsString = tg.guardToAssertion(
    (v: unknown): v is string => typeof v === 'string'
)
assertIsString('ok')  // passes
assertIsString(42)    // throws TypeError
```
