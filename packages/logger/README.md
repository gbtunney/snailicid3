# @snailicid3/logger 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/logger)](https://www.npmjs.com/package/@snailicid3/logger)
[![license](https://img.shields.io/npm/l/@snailicid3/logger)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Structured logging, terminal helpers, tables, spinners, and a shell adapter for Node.js CLIs._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)

### Repository

- **GitHub:**
  [`@snailicid3/logger`](https://github.com/gbtunney/snailicid3/tree/main/packages/logger) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/logger 🐌

---

Structured logging, terminal presentation helpers, tables, spinners, and the `snail-sh` adapter for
Node.js command-line tools.

> **Release status:** npm currently serves `@snailicid3/logger@0.0.6`. The implementation and
> ownership migration in this checkout are complete but have not been released yet; this repository
> consumes the local workspace package until the next release is prepared.

## Installation

```sh
pnpm add @snailicid3/logger
```

The root entry point supports ESM imports and CommonJS `require`. The package also exposes a demo
entry point and one executable:

| Entry                     | Format           | Purpose                                                  |
| ------------------------- | ---------------- | -------------------------------------------------------- |
| `@snailicid3/logger`      | ESM and CommonJS | Logger, formatting, spinner, table, and terminal helpers |
| `@snailicid3/logger/demo` | ESM              | Runnable presentation demos                              |
| `snail-sh`                | Node executable  | Shell-friendly adapter over the terminal helpers         |

## Level logger

`getLogger()` returns a functional logger with `trace`, `debug`, `info`, `warn`, `error`, and
`fatal` methods. Set `level: 'silent'` to suppress output.

```ts
import { getLogger } from '@snailicid3/logger'

const log = getLogger({
  colors: {
    error: '#ff4d6d',
    info: 'cyan',
    warn: 'yellow',
  },
  level: 'debug',
  name: 'release',
  time_stamp: true,
})

log.info('Preparing packages')
log.debug({ packageCount: 8 })
log.warn('Workspace is dirty')
log.error('Publish failed')
```

Color values are ordinary strings. Ansis palette names, valid CSS color names, and hex colors are
accepted. `parseHexColor()` is available when strict color parsing is useful.

## Terminal presentation

The named terminal helpers build strings instead of writing implicitly, so callers decide where and
when output is displayed.

```ts
import { header, section, statusPair, table } from '@snailicid3/logger'

console.log(header('Release check', { style: 'cyan', width: '80%' }))
console.log(section('Packages'))
console.log(statusPair('logger', 'passed', { level: 'success' }))
console.log(
  table(
    [
      ['logger', '0.0.6', 'ready'],
      ['workspace', '0.0.0', 'private'],
    ],
    { head: ['Package', 'Version', 'Status'], preset: 'header' },
  ),
)
```

The presentation surface includes:

- layout helpers: `block`, `rule`, `line`, `spacer`, `header`, `section`, `subheader`, and `step`
- report helpers: `kvPair`, `statusPair`, `table`, `kabob`, and its `kebab` alias
- color helpers: `styleText`, `GREY`, `GRAY`, `greyRamp`, and `grayRamp`
- width helpers: `resolveWidth`, `visibleLength`, and `stripAnsi`
- value formatting: `fmt`, `formatArgs`, `formatValue`, and `prettify`

## Spinners

```ts
import { createSpinner } from '@snailicid3/logger'

const spinner = createSpinner('Building packages')
spinner.start()
spinner.setText('Packing artifacts')
spinner.persist('Artifacts ready')
```

A spinner can finish with `succeed()`, `fail()`, `warn()`, `info()`, or `persist()`. Its `status`
property records the last state. `createProgressBar()` remains as a compatibility alias for
`createSpinner()`.

## Shell adapter

`snail-sh` normalizes hyphenated and underscored action names, then validates positional arguments
with Zod.

```sh
pnpm exec snail-sh success "Build passed"
pnpm exec snail-sh status-pair "lint-staged" "passed" "success"
pnpm exec snail-sh kabob "🐌 Running tests" "90%" "magenta" "true"
pnpm exec snail-sh gray-ramp " " 3
```

Supported actions include `created`, `critical`, `die`, `error`, `gray-ramp`, `header`, `info`,
`kabob`, `kv-pair`, `line`, `log`, `rule`, `section`, `skipped`, `spacer`, `status-pair`, `step`,
`subheader`, `success`, and `warning`.

## Known Doctor fixtures

The runtime ESM and CommonJS named exports currently load successfully. Some declaration and
package-contract drift is deliberately retained as input for the read-only Doctor:

- the root export map has `import` and `require` branches but no explicit `types` condition
- API Extractor reports forgotten supporting exports used by public types
- both bundled declarations in `dist/` and the separate `types/` tree are packed
- the root build is classified as universal even though the current implementation reaches
  `node:util`

These are expected findings, not an invitation for Doctor to mutate the package. Do not normalize
them incidentally; the fixture IDs and retirement rules live in the architecture/refactor plan. They
do not keep the logger implementation phase open. Unregistered export problems remain ordinary bugs.

The current Doctor MVP reports `EXP-LOGGER-001`. API-report, packed-declaration, and runtime-intent
collectors remain later slices for the other three logger fixtures.

## Release rehearsal

The shared candidate baseline is `68ab0564b2dc0f23b3ce3424beeb12225941c13d`. Before releasing the
completed checkout changes:

- record a logger changeset/version decision
- pack from the candidate SHA and inspect both declaration trees
- load the installed package through ESM and CommonJS
- run the installed `snail-sh` binary in a clean consumer
- treat the registered Doctor fixtures as expected findings and every other failure as a blocker

Publish logger only after `@snailicid3/node-utils` is available to the release-test registry. The
full dependency order is recorded in the repository architecture/refactor plan.

## Development

Run package tasks from the monorepo root:

```sh
pnpm --filter=@snailicid3/logger build:nx
pnpm --filter=@snailicid3/logger test:nx
pnpm --filter=@snailicid3/logger demo
pnpm --filter=@snailicid3/logger demo:levels
pnpm --filter=@snailicid3/logger demo:spinner
```

The package build emits ESM and CommonJS root entries, an ESM demo, and the ESM `snail-sh`
executable.
