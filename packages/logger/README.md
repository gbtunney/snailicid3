<!-- @snailicid3:header:start -->

# @snailicid3/logger

> Unified Node logger with chalk output and shell script counterpart

<!-- @snailicid3:header:end -->

## Installation

```sh
pnpm add @snailicid3/logger -D
```

```ts
import {
    getLogger,
    LogLevelName,
    ChalkColor,
    parseHexColor,
} from '@snailicid3/logger'

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