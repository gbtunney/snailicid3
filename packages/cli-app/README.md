# @snailicid3/cli-app 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/cli-app)](https://www.npmjs.com/package/@snailicid3/cli-app)
[![license](https://img.shields.io/npm/l/@snailicid3/cli-app)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Zod-backed CLI application framework for typed Node.js commands._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![Yargs](https://img.shields.io/badge/Yargs-000000?style=for-the-badge&logo=yargs&logoColor=white)](https://yargs.js.org/)

### Repository

- **GitHub:**
  [`@snailicid3/cli-app`](https://github.com/gbtunney/snailicid3/tree/main/packages/cli-app) •
  [`snailicid3`](https://github.com/gbtunney/snailicid3)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/cli-app 🐌

---

This package provides a Zod-backed CLI application framework built on top of `yargs`. It integrates
with `@snailicid3/logger` for structured output and `@snailicid3/color` for styled terminal text.
Used internally by scaffold and other CLI tools in this monorepo.

### `@snailicid3/cli-app` _contains:_

- **CLI framework** — `yargs`-based command routing with Zod schema validation
- **Styled output** — logger/Ansis + figlet header banners
- **Logging** — integrated `@snailicid3/logger` support
- **Types** — typed argument schemas via Zod

### Argv is tokenized once

Yargs owns argv token semantics — options, aliases, arrays, help, version, usage — and Zod owns
validation, defaults and transforms. They meet at one seam:

```text
string[] argv
  -> cli-app configures Yargs from the schema plus CLI metadata
  -> Yargs parses once (options, aliases, positionals)
  -> node-utils' shared validator separates "_"/"$0" and applies Zod
  -> typed result
```

`initApp` hands the record from its own configured Yargs instance to node-utils'
`safeValidateArgvRecord`. It does not call `parseArgv`, which would build a second Yargs instance
and tokenize the same argv again. Because the shared validator strips Yargs' `_` and `$0`
bookkeeping keys, an options schema may be a `z.strictObject`.

Lightweight callers keep using `parseArgv`/`safeParseArgv` from `@snailicid3/node-utils`; those now
delegate to the same validator, so there is one implementation rather than two.

### Curated re-exports

cli-app re-exports the logger's terminal and colour helpers plus the node-utils filesystem schemas
(including `fsTypedPath`), so a CLI does not need to reach past cli-app for ordinary output and path
options. Raw Ansis is deliberately not re-exported.

## Installation

```sh
pnpm add @snailicid3/cli-app
```

Define CLI flags with a Zod object, then pass it to `initApp`:

```ts
import { fsPath, fsTypedPath } from '@snailicid3/node-utils'
import { initApp, type AppConfigIn, type InitSuccessCallback } from '@snailicid3/cli-app'
import { z } from 'zod'

const optionsSchema = z.object({
  file: fsTypedPath('file', { exists: true }).optional().meta({
    alias: 'i',
    description: 'Existing input file',
  }),
  format: z.enum(['json', 'text']).default('text').meta({
    alias: 'f',
    description: 'Output format',
  }),
  filename: z.string().default('output.json').meta({
    description: 'Output filename within --out-dir',
  }),
  outDir: fsPath()
    .prefault('dir')
    .meta({
      alias: ['o', 'out'],
      description: 'Output directory path',
    }),
  sourceDir: fsTypedPath('directory').prefault('.').meta({
    alias: 's',
    description: 'Existing source directory',
  }),
  tags: z.array(z.string()).default([]).meta({
    alias: 'z',
    description: 'Tag; repeat this flag to supply multiple tags',
  }),
})

const config: AppConfigIn = {
  description: 'Process a directory using typed command-line options.',
  examples: [
    ['$0 -z gbt -z gbt2', 'Supply multiple tags'],
    ['$0 --source-dir ./src -f json', 'Choose a directory and format'],
  ],
  name: 'my-cli',
  version: '1.0.0',
}

const run: InitSuccessCallback<typeof optionsSchema> = (args) => {
  // args is the validated and transformed Zod output.
  // Cross-field paths stay simple:
  // const outputFile = path.resolve(args.outDir, args.filename)
  console.log(args)
}

await initApp(optionsSchema, config, run)
```

## Help text and flag metadata

`AppConfig.description` supplies the command-level description shown above the options table.
`AppConfig.examples` supplies the examples shown at the bottom of the help output.

Use Zod's `.meta()` on an individual field to configure its help row:

```ts
z.string().meta({
  alias: ['n', 'name'],
  description: 'Human-readable project name',
  hidden: false,
})
```

- `description` explains the flag in `--help`.
- `alias` accepts one alias or an array of aliases.
- `hidden: true` keeps the option out of help.
- `.default(...)` displays and supplies a default.
- `.optional()` makes a flag optional; fields without a default or `.optional()` are required.
- `z.enum(...)` becomes a yargs choices list.
- `z.array(...)` becomes a repeatable yargs option.

Array flags are supplied by repeating the option:

```sh
my-cli -z gbt -z gbt2
my-cli --tags gbt --tags gbt2
my-cli --thresholds 10 --thresholds 20
```

The callback receives arrays after yargs parsing and Zod validation:

```ts
{
    tags: ['gbt', 'gbt2'],
    thresholds: [10, 20],
}
```

## JSON object and array flags

`jsonStringified` from `@snailicid3/utils` validates a JSON string against a typed schema. Add a
field-level transform when the callback should receive the decoded value instead of the validated,
branded string:

```ts
import { jsonStringified } from '@snailicid3/utils'

const settingsJson = jsonStringified(
  z.object({
    enabled: z.boolean(),
    labels: z.array(z.string()),
  }),
)

const optionsSchema = z.object({
  settings: settingsJson.transform((raw) => settingsJson.deserialize(raw)),
})
```

```sh
my-cli --settings '{"enabled":true,"labels":["one","two"]}'
```

The option remains a string in generated help while the callback receives the typed object. The same
pattern works with `jsonStringified(z.array(...))` for a JSON-encoded array.

## Filesystem flags

`@snailicid3/node-utils` provides the schemas used for filesystem-aware CLI flags:

- `fsPath()` normalizes a path but allows a target that does not exist, which is appropriate for
  output paths.
- `fsTypedPath('directory')` accepts and brands an existing directory.
- `fsTypedPath('file')` accepts and brands an existing file.
- `fsTypedPath(['file', 'directory'] as const)` accepts either type and preserves the output union.
- `fsTypedPath('glob', { exists: true })` additionally requires the glob to match an entry.
- `fsTypedPath('any')` accepts any recognized file, directory, symlink, or glob path.

See [`src/example/`](./src/example/) for a runnable reference containing strings, numbers, booleans,
enums, arrays, and filesystem paths:

```sh
pnpm --filter @snailicid3/cli-app test:example --help
pnpm --filter @snailicid3/cli-app test:example -z gbt -z gbt2
```

## Spinner utility

The spinner is owned by `@snailicid3/logger`; cli-app temporarily re-exports its original
`createProgressBar` name for compatibility. New code can use `createSpinner`:

```ts
import { createSpinner } from '@snailicid3/cli-app'

const run: InitSuccessCallback<typeof optionsSchema> = async (args) => {
  const spinner = createSpinner('Processing files:')
  spinner.start()

  // Perform your operations
  await processFiles(args)

  spinner.stop()
  console.log('Complete!')
}
```

## Deferred: interactive schema prompts

Invalid arguments currently produce a formatted Zod error and return without invoking the success
callback. An Inquirer-style prompt layer that fills missing required options and positionals from
the same schema is **explicitly deferred**. When it lands it must be an adapter over the same
command definition — not a second declaration or a second parser — and the first useful widget is
expected to be a filesystem-path picker built on the existing path schemas. It does not block
Doctor's initial CLI.

## Deferred: schema-driven commands and positionals

Explicit command definitions backed by Yargs child commands — inferring a command-discriminated
union callback result, with command-specific help — are not implemented yet. Doctor should not
commit to a subcommand interface until they land, so it receives command-specific help without
another CLI rewrite.

## Future improvement: end-to-end example test

The example is currently tested in-process for argument mapping, repeated arrays, JSON decoding,
filesystem validation, and generated help. A future hardening test could spawn the runnable example
and assert its exit code, stdout, stderr, and invalid-input behavior. This is useful additional
coverage, but is not required for the initial release.

## Future improvement: object-level transforms

Field-level transforms such as filesystem normalization and JSON decoding are supported. A transform
on the root object changes it from a `ZodObject` into a `ZodPipe`, which `initApp` and the help
mapper do not currently accept. Cross-field derived values should therefore be calculated after
parsing for now; supporting separate CLI-input and transformed-output root schemas is a future
improvement.
