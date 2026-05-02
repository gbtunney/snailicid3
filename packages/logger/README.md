# @snailicid3/logger 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/logger)](http://www.npmjs.com/package/@snailicid3/logger)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/logger)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Unified Node.js logger with chalk-powered colored output._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:** [`@snailicid3/logger`](https://github.com/gbtunney/snailicid3/tree/main/packages/logger) • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/logger 🐌

---

This package provides a structured Node.js logger with configurable chalk colors per log level. Log levels include `info`, `warn`, `error`, `debug`, and `trace`. Colors can be specified as chalk color names or hex strings.

### `@snailicid3/logger` _contains:_

- **`getLogger`** — create a logger instance with per-level color configuration
- **Log levels** — `info`, `warn`, `error`, `debug`, `trace`
- **Color support** — chalk color names and hex color strings via `@snailicid3/color`
- **Types** — `LogLevelName`, `ChalkColor`

## Installation

```sh
#pnpm
$ pnpm add @snailicid3/logger

#yarn
$ yarn add @snailicid3/logger

#npm
$ npm install @snailicid3/logger
```

## Examples

```ts
import { getLogger, parseHexColor } from '@snailicid3/logger'

const LOGGER = getLogger({
    colors: {
        info: 'greenBright',
        warn: parseHexColor('#03fc0b'),
        error: 'bgRedBright',
    },
})

LOGGER.info('Hello, world!')
LOGGER.warn('This is a warning.')
LOGGER.error('This is an error.')
LOGGER.debug('This is a debug message.')
LOGGER.trace('This is a trace message.')
```
