# snailicid3

> @snailicid3 monorepo — TypeScript utility libraries and tooling

## Packages

| Package                                                  | Description                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`@snailicid3/config`](./packages/config)               | ESLint, Prettier, markdownlint, commitlint and TypeScript base configs |
| [`@snailicid3/build-config`](./packages/build-config)   | tsdown, vite, vitest and typedoc build tool configs                    |
| [`@snailicid3/types`](./packages/types)                 | Pure TypeScript types, utility types and typeguards                    |
| [`@snailicid3/utils`](./packages/utils)                 | String, numeric, object, date and fmt utilities                        |
| [`@snailicid3/color`](./packages/color)                 | Color math, parsing, conversion and hex utilities                      |
| [`@snailicid3/node-utils`](./packages/node-utils)       | Node.js filesystem, path and package.json utilities                    |
| [`@snailicid3/logger`](./packages/logger)               | Unified Node logger with chalk output                                  |
| [`@snailicid3/cli-app`](./packages/cli-app)             | Zod-backed CLI app framework                                           |
| [`@snailicid3/scaffold`](./packages/scaffold)           | Package scaffolding generator                                          |
| [`@snailicid3/example-package`](./packages/example-package) | Example monorepo package template                                |

## Apps

| App                               | Description            |
| --------------------------------- | ---------------------- |
| [`playground`](./apps/playground) | Development playground |

## Setup

```sh
pnpm install
pnpm build
```

## Requirements

- Node.js `lts/iron` (20.x)
- pnpm `>=10.0.0`
