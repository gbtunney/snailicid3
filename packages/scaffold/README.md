# @snailicid3/scaffold 🐌

> _Workspace package — not published to npm_

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Zod](https://img.shields.io/badge/zod-%233068b7.svg?style=for-the-badge&logo=zod&logoColor=white)

### Repository

- **Github:** [`@snailicid3/scaffold`](https://github.com/gbtunney/snailicid3/tree/main/packages/scaffold) • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

## @snailicid3/scaffold 🐌

---

This package provides a package scaffolding generator with TypeScript-function-based templates. It can generate new workspace packages with pre-configured tsdown configs, tsconfigs, and package.json templates.

### `@snailicid3/scaffold` _contains:_

- **Package generator** — creates new monorepo packages from templates
- **TypeScript templates** — tsdown config, tsconfig, package.json templates
- **CLI** — `scaffold` binary for interactive package creation
- **Schema validation** — Zod-backed configuration validation

## Usage

```sh
# Run via pnpm workspace
pnpm --filter=@snailicid3/scaffold exec scaffold
```

## Planned: Package.json Manifest Utilities

- `reorderPackageJsonKeys()` — stable top-level key ordering
- `mergePackageJson()` — merge scaffold defaults into existing manifest
- `updatePackageJsonSections()` — targeted section updates

```ts
declare function reorderPackageJsonKeys(
    packageJson: Record<string, unknown>,
): Record<string, unknown>

declare function mergePackageJson(
    existingPackageJson: Record<string, unknown>,
    scaffoldPackageJson: Record<string, unknown>,
): Record<string, unknown>
```
