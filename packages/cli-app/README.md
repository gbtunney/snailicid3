# @snailicid3/cli-app 🐌

> _Workspace package — not published to npm_

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Zod](https://img.shields.io/badge/zod-%233068b7.svg?style=for-the-badge&logo=zod&logoColor=white)

### Repository

- **Github:** [`@snailicid3/cli-app`](https://github.com/gbtunney/snailicid3/tree/main/packages/cli-app) • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

## @snailicid3/cli-app 🐌

---

This package provides a Zod-backed CLI application framework built on top of `yargs` and `yargs-interactive`. It integrates with `@snailicid3/logger` for structured output and `@snailicid3/color` for styled terminal text. Used internally by scaffold and other CLI tools in this monorepo.

### `@snailicid3/cli-app` _contains:_

- **CLI framework** — `yargs`-based command routing with Zod schema validation
- **Interactive prompts** — `yargs-interactive` integration
- **Styled output** — chalk + figlet header banners
- **Logging** — integrated `@snailicid3/logger` support
- **Types** — typed argument schemas via Zod

## Usage

```sh
pnpm add @snailicid3/cli-app
```
