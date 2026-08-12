# @snailicid3/logger 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/logger)](http://www.npmjs.com/package/@snailicid3/logger)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/logger)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Unified Node.js logger with Ansis-powered colored output._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:**
  [`@snailicid3/logger`](https://github.com/gbtunney/snailicid3/tree/main/packages/logger) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3.git)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/logger 🐌

---

This package provides a structured Node.js logger with configurable colors per log level. Log levels
include `info`, `warn`, `error`, `debug`, and `trace`. Colors are ordinary strings: use terminal
palette names, convenience spellings such as `grey`, any valid CSS color name such as
`rebeccapurple`, or a hex string. Ansis renders the terminal styles while `@snailicid3/color`
normalizes CSS colors.

The package has two deliberately named presentation surfaces:

- **Terminal UI** — the cute snail presentation: sections, rules, status pairs, swatches, ramps,
  spinners, and the future `snail-sh` adapter. `runLoggerDemo()` demonstrates this surface.
- **Level logger** — conventional `trace`/`debug`/`info`/`warn`/`error` messages, optionally with
  timestamps. `runLevelLoggerDemo()` demonstrates it separately.

### `@snailicid3/logger` _contains:_

- **`getLogger`** — create a logger instance with per-level color configuration
- **Log levels** — `info`, `warn`, `error`, `debug`, `trace`
- **Color support** — terminal names, CSS color-name strings, and hex strings
- **Types** — `LogLevelName`, `LoggerColor`
- **Gray ramp** — `greyRamp()`/`grayRamp()`, the `GREY_RAMP`/`GRAY_RAMP` palettes, and numbered or
  short aliases such as `GREY[200]`, `GREY.lt`, `GREY[600]`, `GREY.md`, and `GREY.dk`
- **Spinner** — `createSpinner()` owns generic Ora progress output; `createProgressBar()` remains as
  a compatibility alias. Spinners expose idle/running/final status and can finish with `succeed()`,
  `fail()`, `warn()`, `info()`, or a persistent `🐌` symbol.
- **Clean spacing** — `block(content, { before, after })` normalizes surrounding newlines.
- **Tables** — `table(rows, { head, widths })` renders compact Unicode status/report tables with
  cli-table3.

## Installation

```sh
#pnpm
$ pnpm add @snailicid3/logger

#yarn
$ yarn add @snailicid3/logger

#npm
$ npm install @snailicid3/logger
```

## Shell adapter

The logger package owns the schema-validated `snail-sh` dispatcher. Hyphenated and underscored
action names are equivalent:

```sh
snail-sh success "Build passed"
snail-sh status-pair "lint-staged" "passed" "success"
snail-sh kabob "🐌 Running tests" "90%" "magenta" "true"
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
