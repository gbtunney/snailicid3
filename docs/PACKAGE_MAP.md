# @snailicid3 monorepo — Package Map

> Fresh start reference. Maps old `@snailicide` source to new package boundaries.
> Last updated: 2026-04-08

---

## Dependency graph (bottom = no deps, top = most deps)

```
                    ┌─────────────────┐   ┌──────────────────┐
                    │   workspace-    │   │    scaffold       │
                    │   tools         │   │  (cli-template)   │
                    └────────┬────────┘   └────────┬─────────┘
                             │                     │
              ┌──────────────▼─────────────────────▼──────────┐
              │                   cli-app                      │
              └──────────────┬─────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │            logger            │
              └──┬──────────────────────┬───┘
                 │                      │
    ┌────────────▼───┐         ┌────────▼────────┐
    │    node-utils   │         │      color       │
    └────────┬────────┘         └────────┬────────┘
             │                           │
    ┌────────▼───────────────────────────▼────────┐
    │                   utils                      │
    │   (string · numeric · object · fmt · json)   │
    └────────────────────┬────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │        types         │
              │  (typeguards · tg)   │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
  ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼──────────┐
  │   config    │ │ build-config│ │   zod-helpers   │
  │  (lint/ts)  │ │(rollup/vite)│ │                 │
  └─────────────┘ └─────────────┘ └────────────────┘
```

---

## Packages

---

### `@snailicid3/types`

**Purpose:** Pure TypeScript — types, utility types, typeguards. Zero runtime, zero deps outside `type-fest`.
The foundation layer everything else imports from.

**Runtime:** universal (no Node, no browser APIs)

**Source origin:**
- `g-library/src/types/` — all utility types, `Json` namespace, `Simplify` etc.
- `g-library/src/typeguard/` — `tg` namespace, `isJsonifiable`, `isJsonValue` etc.

**Key exports:**
```ts
export type * from './utility.js'       // Json, Simplify, KeysOf, EntriesOf, etc.
export { tg } from './typeguard/index.js'
```

**Dependencies:** `type-fest`

**Notes:** No barrel re-exports of runtime code. If it has a `function` body, it doesn't belong here unless it's a typeguard.

---

### `@snailicid3/utils`

**Purpose:** Pure utility functions — string transforms, numeric helpers, typed object methods, safe JSON, date/duration/timestamp helpers, and `fmt` (the tagged template literal that silences `restrict-template-expressions`).

**Runtime:** universal (no Node, no browser APIs)

**Source origin:**
- `g-library/src/string/` — string transforms, trim, replace, pattern matching
- `g-library/src/regexp/` — `regexp` namespace
- `g-library/src/number/` — numeric helpers
- `g-library/src/object/entries.ts` — `keysOf`, `entriesOf`, `fromEntries`, `mapKeys`, `mapObject`, `mapValues`
- `g-library/src/object/json.ts` — `prettyPrintJSON`, `safeSerializeJson`, `safeDeserializeJson`
- `build-config/src/logger/pretty.print.ts` — `fmt`, `formatValue`, `formatArgs` (extract only, remove chalk/util.inspect)
- `g-library/src/date/date.ts` — date formatting, validation, duration, high-res timestamp helpers

**Key exports:**
```ts
export { stringUtils } from './string/index.js'
export { regexp } from './regexp/index.js'
export * as numeric from './number/index.js'
export { keysOf, entriesOf, fromEntries, mapKeys, mapObject, mapValues } from './object/entries.js'
export { prettyPrintJSON, safeSerializeJson, safeDeserializeJson } from './object/json.js'
export { fmt, formatValue, formatArgs } from './fmt.js'
export { flatten, unflatten } from 'flat'
// date — three focused subnamespaces
export { dateUtils } from './date/date.js'        // formatIsoDate, isValidDate, isValidIsoDate
export { durationUtils } from './date/duration.js' // formatDurationFromMs, format presets
export { timestampUtils } from './date/timestamp.js' // nsToMs, highresTimestamptoISOString, getTimestampDuration
export { dayjs } from './date/dayjs.js'           // pre-extended instance (utc + customParseFormat + duration)
```

**Dependencies:** `type-fest`, `flat`, `ts-deepmerge`, `dayjs`, `@snailicid3/types`

**Notes:**
- `fmt` / `formatValue` / `formatArgs` live here because they're used across `cli-app`, `node-utils`, `build-config` etc. — not just the logger
- `fmt` specifically exists to safely interpolate `unknown` into template strings without triggering `@typescript-eslint/restrict-template-expressions`. Document this clearly in the README so future-you doesn't move it
- `util.inspect` and chalk do NOT come in here — those stay in `logger`
- The `JsonStringified` / Zod codec stuff (`makeJsonStringifiedSchema`, `jsonParser`) goes in `zod-helpers`, not here
- Date utils are split into three subnamespaces so consumers can import only what makes sense for their context — shortcuts/assistant code uses `dateUtils`, video annotation uses `timestampUtils`, logger uses `durationUtils`
- `dayjs.js` exports a single pre-extended instance so consumers never have to call `dayjs.extend()` themselves — the side effect happens once here and nowhere else

---

### `@snailicid3/color`

**Purpose:** Color math — parsing, conversion, manipulation, hex utilities. The leaf dep for both `logger` (chalk color mapping) and `zod-helpers` (color schemas).

**Runtime:** universal

**Source origin:**
- `g-library/src/color/` — main color utils
- `build-config/src/logger/utilities/color.ts` — `HexColor`, `parseColorJS`, `parseColorToHexStrict`, `readableTextHex`, `mapColorJSCoords`, `normalizeRGBCoords`, `isHexColor`, `assertHexColor`
- `g-library/src/number/` — `mapRange`, `roundToDecimals` (only the pieces color needs — these stay in `utils` too, color just imports them)

**Key exports:**
```ts
export type { HexColor, ColorJS }
export { isHexColor, assertHexColor, parseColorJS, parseColorToHexStrict, readableTextHex }
export { mapColorJSCoords, normalizeRGBCoords }
```

**Dependencies:** `colorjs.io`, `chroma.ts`, `@snailicid3/utils`

**Notes:** The `chalk`-specific stuff (`getColorChalkInstance`, `wrapColorChalkInstanceText`, `isChalkColorPreset`) does NOT belong here — it goes in `logger`. `color` should have no knowledge of chalk.

---

### `@snailicid3/zod-helpers`

**Purpose:** Reusable Zod schemas and schema patterns. Color schemas, string validators, the `JsonStringified` codec.

**Runtime:** universal

**Source origin:**
- `g-library/src/zod_helpers/` — main zod helpers
- `g-library/src/object/json-stringified.ts` — `JsonStringified`, `makeJsonStringifiedSchema`, `jsonParser`, `jsonStringified`, `jsonLooseCodec`

**Key exports:**
```ts
export { zodHelpers } from './index.js'
export type { ZodRegExp }
export { makeJsonStringifiedSchema, jsonParser, jsonStringified } from './json-stringified.js'
export type { JsonStringified, JsonStringifiedSchema, JsonStringifiedAPI }
```

**Dependencies:** `zod`, `@snailicid3/types`, `@snailicid3/color` (for color schemas), `@snailicid3/utils`

**Notes:** The `zod.node.ts` path schemas (`fsPath`, `fsPathArray`, `fsPathExists`) do NOT belong here despite living in `g-library` — they go in `node-utils` where the filesystem context makes sense.

---

### `@snailicid3/node-utils`

**Purpose:** Node.js filesystem and path utilities. The only package in the "pure library" tier that requires Node.

**Runtime:** Node only

**Source origin:**
- `g-library/src/node/file.path.array.ts` — `FilePath`, `FileType`, `getFilePathArr`, `getFullPath`, `normalizePath`, `doesFileExist`, `getExistingPathType`
- `g-library/src/node/export.json.file.ts` — `exportJSONFile`, `JSONExportEntry`, `JSONExportConfig`
- `g-library/src/node/encode-base64.ts` — `getImageBase64`, `ImageMimeType`
- `g-library/src/node/yargs-util.ts` — `getArgsObject`, `getYArgs`
- `g-library/src/node/zod.node.ts` — `fsPath`, `fsPathArray`, `fsPathExists` (Zod schemas for path resolution)

**Key exports:**
```ts
export { node } from './index.js'
export type { FilePath, FileType, JSONExportEntry, JSONExportConfig, ImageMimeType }
export { exportJSONFile, getImageBase64, getArgsObject, getYArgs }
export { fsPath, fsPathArray, fsPathExists }   // Zod path schemas
```

**Dependencies:** `fs`, `path`, `glob`, `is-glob`, `yargs`, `zod`, `@snailicid3/types`, `@snailicid3/utils`

**Notes:** The Zod path schemas live here (not in `zod-helpers`) because they import `fs` and `path` — they're Node-specific by nature. `zod-helpers` stays universal.

---

### `@snailicid3/logger`

**Purpose:** Unified logger with structured log levels, chalk-based terminal output, header bars, and H-rules. Matching shell script output is a future goal.

**Runtime:** Node only

**Source origin:**
- `build-config/src/logger/logger.ts` — `LOG_LEVELS`, `LEVEL_COLORS`, `LEVEL_NAMES`, logger core
- `build-config/src/logger/utilities/chalk.ts` — `ChalkColor`, `isChalkColorPreset`, `getColorChalkInstance`, `wrapColorChalkInstanceText`
- `build-config/src/logger/utilities/numeric.ts` — logger-specific numeric (header bar widths etc.)
- `build-config/src/logger/utilities/string.ts` — logger-specific string (padding, truncation)
- `build-config/src/logger/index.ts`

**Key exports:**
```ts
export { logger } from './logger.js'
export type { LogLevelName, LogLevelColors, LoggerRecord }
export type { ChalkColor, ChalkColorPreset }
```

**Dependencies:** `chalk`, `dayjs`, `zod`, `@snailicid3/color`, `@snailicid3/utils`

**Notes:**
- Imports `fmt`/`formatValue` from `@snailicid3/utils` — does NOT redefine them
- `util.inspect` lives here (used inside `formatValue` for objects — but that version of `formatValue` is the Node/logger-enriched one, distinct from the universal `fmt` in `utils`)
- Shell output side (`sh-logger.sh`) is **already done** in `boilerplatev3/scripts/lib/sh-logger.sh` — moves to `workspace-tools/bin/shell/sh-logger.sh` as a static asset, sourced by Actions
- `sh-logger.sh` has: full ANSI palette, `rule()` with `%`/auto/fixed width, `section()`, `kv_pair()`, `status_pair()`, `header()`, `subheader()`, `log/success/warn/err/info/step/created/skipped`, `spacer()`, `hrule()`. It is complete, do not rewrite it
- Header bars / H-rules / loaders for the Node side go here, matching the shell output visually

---

### `@snailicid3/config`

**Purpose:** Shared lint and TypeScript configs consumed by all other packages. No runtime exports.

**Runtime:** tooling only (dev dependency everywhere)

**Source origin:**
- `build-config/src/eslint/` — ESLint base config, rules, plugins
- `build-config/src/prettier/` — Prettier config
- `build-config/src/markdownlint/` — markdownlint config
- `build-config/src/commitlint/` — commitlint config
- `build-config/src/tsconfig/` — TS base configs

**Key exports:**
```ts
// consumed via extends, not import
export { eslintConfig } from './eslint/index.js'
export { prettierConfig } from './prettier/index.js'
export { markdownlintConfig } from './markdownlint/index.js'
export { commitlintConfig } from './commitlint/index.js'
// tsconfig files referenced via "extends": "@snailicid3/config/tsconfig/base.json"
```

**Dependencies:** `eslint`, `prettier`, `markdownlint`, `typescript`, plus their plugin ecosystems

**Notes:** This was the "too much" part of `build-config`. Splitting linting/tsconfig out here means `build-config` can be a lighter package with only build-tool concerns.

---

### `@snailicid3/build-config`

**Purpose:** Shared build tool configs — rollup, vite, vitest, typedoc. Consumed as dev dependencies.

**Runtime:** tooling only

**Source origin:**
- `build-config/src/rollup/`
- `build-config/src/vite/`
- `build-config/src/vitest/`
- `build-config/src/typedoc/`
- `build-config/src/vitepress/`
- `build-config/src/export.json.file.ts` — build-time JSON export helper (this one uses `fs`, separate from `node-utils` version which is runtime)

**Dependencies:** `rollup`, `vite`, `vitest`, `typedoc`, `vitepress` (all peer/dev)

**Notes:** Does NOT contain ESLint, Prettier, TS configs anymore — those are in `config`. Does NOT contain logger, color, or any runtime utilities.

---

### `@snailicid3/cli-app`

**Purpose:** Zod-backed CLI app framework. Move as-is, rescope only.

**Runtime:** Node only

**Source origin:** `packages/cli-app/src/` — move wholesale

**Dependencies:** `zod`, `yargs`, `@snailicid3/types`, `@snailicid3/utils`, `@snailicid3/node-utils`

**Notes:** `string-utils.ts` and `numeric-utilities.ts` inside cli-app currently duplicate things that will exist in `utils` — consolidate after `utils` is stable.

---

### `@snailicid3/scaffold`

**Purpose:** Package scaffolding / code generator. Stamps out new monorepo packages with consistent `package.json`, `tsconfig.json`, `rollup.config.mts`, and `README.md`.

**Runtime:** Node only (CLI tool)

**Source origin:** `packages/cli-template/` — gutted and rewritten. The `.hbs` template files and Plop/Handlebars are dropped entirely.

**Dependencies:** `@snailicid3/cli-app`, `@snailicid3/node-utils`, `@snailicid3/build-config` — NO `handlebars`, NO `plop`

**Why Handlebars/Plop is being dropped:**
The `.hbs` template files are opaque strings to every tool in the chain. VSCode can't syntax-highlight them, Prettier throws on them, ESLint ignores or errors on them. Any `{{variable}}` inside what should be valid TypeScript makes the file unparseable. The result was that templates were never updated because editing them blind with no feedback loop was too painful.

**Approach — TypeScript functions instead of template files:**

Files that are structured data (`package.json`, `tsconfig.json`) are generated from functions returning plain typed objects. Files that must be source code (`rollup.config.mts`, `README.md`) are generated from template literals inside TypeScript. Everything is normal TypeScript — VSCode autocompletes it, Prettier formats it, types catch mistakes.

**Internal structure:**
```
scaffold/
├── src/
│   ├── templates/
│   │   ├── package-json.ts     # generatePackageJson(input) → PackageJson object
│   │   ├── tsconfig.ts         # generateTsConfig(input) → tsconfig object
│   │   ├── rollup-config.ts    # generateRollupConfig(input) → string (template literal)
│   │   └── readme.ts           # generateReadme(input) → string (template literal)
│   ├── scaffold.ts             # scaffoldPackage(input, outDir) — writes files to disk
│   ├── input.ts                # ScaffoldInput Zod schema + type
│   └── index.ts
└── bin/
    └── scaffold.ts             # CLI entry point via @snailicid3/cli-app
```

**Key exports:**
```ts
export { scaffoldPackage } from './scaffold.js'
export type { ScaffoldInput } from './input.js'
// templates exported so they can be used or overridden individually
export { generatePackageJson } from './templates/package-json.js'
export { generateTsConfig } from './templates/tsconfig.js'
export { generateRollupConfig } from './templates/rollup-config.js'
export { generateReadme } from './templates/readme.js'
```

**`package-json.ts` pattern** — typed object, no string interpolation:
```ts
import type { PackageJson } from '@snailicid3/node-utils'

export const generatePackageJson = (input: ScaffoldInput): PackageJson => ({
    name: `@snailicid3/${input.name}`,
    version: '0.0.0',
    description: input.description,
    private: false,
    type: 'module',
    exports: {
        '.': {
            import: './dist/index.js',
            types: './dist/index.d.ts',
        },
    },
    scripts: {
        '\n========== DEVELOPMENT >> ==========': '',
        dev: 'tsc --build --watch',
        '\n========== TEST >> ==========': '',
        'test:watch': 'vitest watch',
        'test:coverage': 'vitest run --coverage',
    },
    devDependencies: {
        '@snailicid3/config': 'workspace:*',
        '@snailicid3/build-config': 'workspace:*',
        typescript: 'catalog:',
        vitest: 'catalog:',
    },
})
```

**`rollup-config.ts` pattern** — template literal inside TS, still formatted by Prettier:
```ts
export const generateRollupConfig = (input: ScaffoldInput): string => `
import { rollup } from '@snailicid3/build-config'
import type { RollupOptions } from 'rollup'
import pkg from './package.json' with { type: 'json' }

const CONFIG = rollup.getConfigEntries(
    { output_dir: './dist/', source_dir: './src/' },
    [{ export_key: '*', export_types: ['import', 'types'], library_name: '${input.name}' }],
    rollup.DEFAULT_PLUGINS_BUNDLED,
    pkg,
)

export default rollup.getRollupConfig(CONFIG)
`.trimStart()
```

**`scaffold.ts` — the writer:**
```ts
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export const scaffoldPackage = (input: ScaffoldInput, outDir: string): void => {
    mkdirSync(join(outDir, 'src'), { recursive: true })

    writeFileSync(
        join(outDir, 'package.json'),
        JSON.stringify(generatePackageJson(input), null, 4),
    )
    writeFileSync(
        join(outDir, 'tsconfig.json'),
        JSON.stringify(generateTsConfig(input), null, 4),
    )
    writeFileSync(join(outDir, 'rollup.config.mts'), generateRollupConfig(input))
    writeFileSync(join(outDir, 'README.md'), generateReadme(input))
    writeFileSync(join(outDir, 'src/index.ts'), `// ${input.name}\n`)
}
```

**`sync.ts` — update mode for existing packages:**
```ts
export type SyncResult = {
    file: string
    action: 'created' | 'updated' | 'skipped' | 'needs-review'
    reason?: string
}

// Run against any existing package dir — safe to rerun, revert via git if needed
export const syncPackage = (
    input: ScaffoldInput,
    packageDir: string,
): Array<SyncResult> => [
    syncPackageJson(input, packageDir),   // deep-merge scripts + devDeps, preserve rest
    syncTsConfig(input, packageDir),      // merge compilerOptions, preserve references
    syncReadme(input, packageDir),        // marker-based header insert/replace
    checkRollupConfig(packageDir),        // flags as needs-review, never overwrites
]
```

**README header sync — marker block pattern:**

The header block is fenced with HTML comments so it's invisible in rendered markdown but findable by string search:

```md
<!-- @snailicid3:header:start -->
# @snailicid3/my-package
> short description

![version](https://img.shields.io/npm/v/@snailicid3/my-package)
<!-- @snailicid3:header:end -->

...rest of existing README untouched below here...
```

Behavior on rerun:
- Markers present → replaces content between them, everything else preserved
- Markers absent, file exists → prepends block, leaves existing content alone
- File does not exist → creates it with just the header block

This works on old READMEs from other projects — run `syncPackage` against `gbt-schema-form-main` packages or the video annotation project, get the header inserted, commit. Revert via git if anything looks wrong.

**`package.json` sync strategy** — merge not replace:
- `scripts` — overwrite entirely with canonical set (this is the drift fix)
- `devDependencies` — add missing catalog entries, leave existing versions alone
- `version`, `dependencies`, `exports`, custom fields — never touched

**Notes:**
- `generatePackageJson` is the single source of truth for script conventions. Updating it propagates to every future package. It imports `PackageJson` from `@snailicid3/node-utils` so the shape is type-checked against the real schema
- The canonical Nx-aware script set (with heading separators) lives here — this is the fix for script drift across packages
- When you need a new package: `pnpm scaffold --name my-package --description "..."` and it's done
- When you want to patch existing packages: `pnpm scaffold --sync --dir ./packages/operator-core`
- Templates can be tested like any other function — pass in input, assert the output shape
- `syncPackage` always returns a `SyncResult[]` report so you know exactly what changed before committing

---

### `@snailicid3/workspace-tools`

**Purpose:** pnpm workspace introspection, repo diagnostics, and GitHub issue management. Replaces the `scripts/` folder in `boilerplatev3` with readable, typed code.

**Runtime:** Node (TypeScript, compiled) + Python (no build step, for gh CLI scripts and diagnostics)

**Internal structure:**

```
workspace-tools/
├── src/                          # Node/TypeScript — compiled, importable
│   ├── exec.ts                   # execCommand, getExecCommandOutput, quoteShellArgument
│   ├── packages.ts               # getWorkspacePackagesList, getWorkspacePackagesLookup,
│   │                             #   getWorkspacePackagesObject, getWorkspaceRoot,
│   │                             #   setPackageKeys, WorkspacePackage type
│   ├── git.ts                    # isRepoClean, ensureRepoClean (repo-ensure-clean.ts)
│   └── index.ts
├── bin/                          # Runnable commands (registered in package.json "bin")
│   ├── node/                     # Node/TS scripts (tsx, no build step needed)
│   │   ├── nx-status.ts          # nx affected project reporter
│   │   ├── prettier-status.ts    # prettier check with colored output
│   │   └── workspace-status.ts   # pnpm outdated -r wrapper
│   ├── python/                   # Python scripts (no build step, readable)
│   │   ├── repo_status.py        # git branch/staged/ahead-behind/last commit report
│   │   ├── env_diagnostics.py    # node/pnpm/git/gh versions, cwd, OS
│   │   ├── issues/
│   │   │   ├── create.py         # gh issue create with argparse flags
│   │   │   ├── delete_all.py     # gh issue/label delete with confirmation prompt
│   │   │   ├── repo_labels.py    # gh label create for full label taxonomy
│   │   │   └── seed_issues.py    # seed example issues by calling create.py
│   │   └── make_executable.py    # chmod +x for .sh files (replaces sh-make-executable.sh)
│   └── shell/
│       └── sh-logger.sh          # KEEP AS SHELL — sourced in Actions, already done
```

**Source origin (boilerplatev3 `scripts/`):**

| Old file | New location | Language |
|---|---|---|
| `scripts/lib/shell-utilities.ts` | `src/exec.ts` | Node — move as-is |
| `scripts/workspace-utils.ts` | `src/packages.ts` | Node — move, fix whitespace/duplicate |
| `scripts/lib/repo-ensure-clean.ts` | `src/git.ts` | Node — move as-is |
| `scripts/report/nx-status.ts` | `bin/node/nx-status.ts` | Node — move, swap inline ANSI for logger |
| `scripts/report/prettier-status.ts` | `bin/node/prettier-status.ts` | Node — move, drop `build:self` hack |
| `scripts/report/workspace-status.sh` | `bin/node/workspace-status.ts` | Node rewrite — one `execCommand` call |
| `scripts/report/repo-status.sh` | `bin/python/repo_status.py` | Python rewrite |
| `scripts/report/env-diagnostics.sh` | `bin/python/env_diagnostics.py` | Python rewrite |
| `scripts/issues/create.sh` | `bin/python/issues/create.py` | Python rewrite |
| `scripts/issues/repo-labels.sh` | `bin/python/issues/repo_labels.py` | Python rewrite |
| `scripts/issues/seed-issues.sh` | `bin/python/issues/seed_issues.py` | Python rewrite |
| `scripts/issues/delete-all.sh` | `bin/python/issues/delete_all.py` | Python rewrite |
| `scripts/lib/sh-make-executable.sh` | `bin/python/make_executable.py` | Python rewrite |
| `scripts/lib/sh-logger.sh` | `bin/shell/sh-logger.sh` | Keep shell — sourced in Actions |
| `scripts/lib/sh-logger-needs-integration.sh` | — | Scratch/notes, discard |

**Why Python for the gh CLI and diagnostic scripts:**
- No build or compile step — edit and run directly
- `argparse` is far more readable than bash flag parsing
- `subprocess.run(['gh', ...])` is clearer than shell command substitution
- `pathlib` + `os.chmod` beats bash glob expansion for `make_executable`
- Already available in Codespaces with no setup

**Why keep `sh-logger.sh` as shell:**
- It's sourced directly inside GitHub Actions `run:` blocks
- It's already complete and stable — never needs editing
- A Node/Python binary can't be `source`d in bash

**Key Node exports (importable by other packages):**
```ts
export { execCommand, getExecCommandOutput, quoteShellArgument } from './exec.js'
export { getWorkspacePackagesList, getWorkspacePackagesLookup,
         getWorkspacePackagesObject, getWorkspaceRoot } from './packages.js'
export type { WorkspacePackage } from './packages.js'
export { isRepoClean, ensureRepoClean } from './git.js'
```

**Dependencies:** `@snailicid3/utils`, `@snailicid3/logger`, `@nx/devkit` (for nx-status)

---

## Root config — `pnpm-workspace.yaml` + `pnpm-catalog.yaml`

`pnpm-workspace.yaml` declares the package globs only. The catalog has been moved to its own file (`pnpm-catalog.yaml`) — a pnpm 10.x feature.

```yaml
# pnpm-workspace.yaml
packages:
    - 'packages/*'
    - 'apps/*'
```

The full catalog lives in `pnpm-catalog.yaml`. It covers shared tooling deps (typescript, vitest, eslint, etc.) and internal `workspace:*` references. External runtime deps (`zod`, `dayjs`, `chalk`, etc.) are declared with **explicit versions** directly in each package's `package.json` — not via `catalog:`. Internal cross-package deps use `workspace:*`.

**Dependency convention per package `package.json`:**
```json
{
  "dependencies": {
    "zod": "^4.0.0",
    "dayjs": "^1.11.13",
    "@snailicid3/types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "@snailicid3/config": "workspace:*"
  }
}
```

**What goes in `pnpm-catalog.yaml` vs not:**
- In catalog: shared tooling (typescript, vitest, eslint, prettier, husky, nx, etc.)
- Explicit versions in package.json: runtime deps specific to a package (zod, chalk, dayjs, colorjs.io, yargs, etc.)
- `workspace:*`: all internal `@snailicid3/*` cross-package deps

---

## Migration order

Build bottom-up. Each step is independently shippable.

```
✅ 1. config          ← src populated from snailicide-monorepo build-config/src/{eslint,prettier,markdownlint,commitlint,tsconfig}
✅ 2. build-config    ← src populated from snailicide-monorepo build-config/src/{rollup,vite,vitest,typedoc,vitepress}
✅ 3. types           ← src populated from g-library/src/{types,typeguard}
✅ 4. utils           ← src populated from g-library/src/{string,regexp,number,object,date} + fmt.ts (universal, no util.inspect)
✅ 5. color           ← src populated from g-library/src/color + build-config logger/utilities/color.ts
✅ 6. zod-helpers     ← src populated from g-library/src/{zod_helpers,object/json-stringified.ts}
✅ 7. node-utils      ← src populated from g-library/src/node/
✅ 8. logger          ← src populated from build-config/src/logger/ (minus color.ts → color pkg, pretty.print.ts → utils)
✅ 9. cli-app         ← src populated wholesale from snailicide-monorepo packages/cli-app/src/
🔲 10. scaffold       ← greenfield implementation pending
✅ 11. workspace-tools ← src from gbt-schema-form bootstrap-actions branch; bin/ scripts written
```

**Next:** scaffold package (TypeScript-function templates, no Handlebars).

---

## What stays in `build-config` (old) for archiving

The old `@snailicide/build-config` was doing too much. For archiving purposes:

| Old location | New home |
|---|---|
| `build-config/src/eslint/` | `@snailicid3/config` |
| `build-config/src/prettier/` | `@snailicid3/config` |
| `build-config/src/markdownlint/` | `@snailicid3/config` |
| `build-config/src/commitlint/` | `@snailicid3/config` |
| `build-config/src/tsconfig/` | `@snailicid3/config` |
| `build-config/src/rollup/` | `@snailicid3/build-config` |
| `build-config/src/vite/` | `@snailicid3/build-config` |
| `build-config/src/vitest/` | `@snailicid3/build-config` |
| `build-config/src/typedoc/` | `@snailicid3/build-config` |
| `build-config/src/logger/pretty.print.ts` (`fmt` only) | `@snailicid3/utils` |
| `build-config/src/logger/` (rest) | `@snailicid3/logger` |
| `build-config/src/logger/utilities/color.ts` | `@snailicid3/color` |
| `build-config/src/logger/utilities/chalk.ts` | `@snailicid3/logger` |

## What stays in `g-library` (old) for archiving

| Old location | New home |
|---|---|
| `g-library/src/types/` | `@snailicid3/types` |
| `g-library/src/typeguard/` | `@snailicid3/types` |
| `g-library/src/string/` | `@snailicid3/utils` |
| `g-library/src/regexp/` | `@snailicid3/utils` |
| `g-library/src/number/` | `@snailicid3/utils` |
| `g-library/src/object/entries.ts` | `@snailicid3/utils` |
| `g-library/src/object/json.ts` | `@snailicid3/utils` |
| `g-library/src/object/json-stringified.ts` | `@snailicid3/zod-helpers` |
| `g-library/src/color/` | `@snailicid3/color` |
| `g-library/src/zod_helpers/` | `@snailicid3/zod-helpers` |
| `g-library/src/node/` | `@snailicid3/node-utils` |
| `g-library/src/node/zod.node.ts` | `@snailicid3/node-utils` |
| `g-library/src/date/` | `@snailicid3/utils` — split into `date/date.ts`, `date/duration.ts`, `date/timestamp.ts`, `date/dayjs.ts` |
| `g-library/src/browser/` | archive (Shopify-era, not in scope) |

---

## What stays in `gbt-schema-form` (bootstrap-actions branch) scripts/ for archiving

| Old file | New home | Notes |
|---|---|---|
| `scripts/lib/sh-logger.sh` | `workspace-tools/bin/shell/sh-logger.sh` | Keep as shell, already complete |
| `scripts/lib/sh-logger-needs-integration.sh` | — | Scratch/notes, discard |
| `scripts/lib/shell-utilities.ts` | `workspace-tools/src/exec.ts` | Move as-is |
| `scripts/lib/repo-ensure-clean.ts` | `workspace-tools/src/git.ts` | Move as-is |
| `scripts/lib/sh-make-executable.sh` | `workspace-tools/bin/python/make_executable.py` | Python rewrite |
| `scripts/workspace-utils.ts` | `workspace-tools/src/packages.ts` | Move, fix whitespace typo + remove duplicate fn |
| `scripts/report/nx-status.ts` | `workspace-tools/bin/node/nx-status.ts` | Move, swap inline ANSI for logger |
| `scripts/report/prettier-status.ts` | `workspace-tools/bin/node/prettier-status.ts` | Move, drop `build:self` hack |
| `scripts/report/workspace-status.sh` | `workspace-tools/bin/node/workspace-status.ts` | Node rewrite |
| `scripts/report/repo-status.sh` | `workspace-tools/bin/python/repo_status.py` | Python rewrite |
| `scripts/report/env-diagnostics.sh` | `workspace-tools/bin/python/env_diagnostics.py` | Python rewrite |
| `scripts/issues/create.sh` | `workspace-tools/bin/python/issues/create.py` | Python rewrite |
| `scripts/issues/repo-labels.sh` | `workspace-tools/bin/python/issues/repo_labels.py` | Python rewrite |
| `scripts/issues/seed-issues.sh` | `workspace-tools/bin/python/issues/seed_issues.py` | Python rewrite |
| `scripts/issues/delete-all.sh` | `workspace-tools/bin/python/issues/delete_all.py` | Python rewrite |
| `scripts/lib/sh-logger-needs-integration.sh` | — | Scratch/notes, discard |
| `scripts/tsconfig.json` | root of `workspace-tools` | Move, adjust paths |

---

## Open questions

- **`browser` utils** — `g-library/src/browser/` is HTML utilities. Was Shopify-era. Archive.
- **`scaffold` package** — greenfield implementation still needed. See package entry above for spec.

## Resolved

- ~~**Nx script offloading**~~ — `nx.json` `targetDefaults` fully configured. `fix` is `cache: false`. Per-package scripts are minimal (dev, test:watch, test:coverage only).
- ~~**`workspace-utils.ts` cleanup**~~ — `setAllPackageKeysExcluding` duplicate removed. `WorkspacePackage` type includes `version` and `private` fields. Sourced from `gbt-schema-form/bootstrap-actions`.
- ~~**Catalog location**~~ — Catalog moved to `pnpm-catalog.yaml` (pnpm 10.x). Runtime deps use explicit versions per package, not `catalog:`. Internal deps use `workspace:*`.
