# @snailicid3/example-package 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/example-package)](https://www.npmjs.com/package/@snailicid3/example-package)
[![license](https://img.shields.io/npm/l/@snailicid3/example-package)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Workspace package and canonical template for new monorepo packages._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![tsdown](https://img.shields.io/badge/tsdown-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://tsdown.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

### Repository

- **GitHub:**
  [`@snailicid3/example-package`](https://github.com/gbtunney/snailicid3/tree/main/packages/example-package)
  • [`snailicid3`](https://github.com/gbtunney/snailicid3)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/example-package 🐌

---

This is an example/template package demonstrating the canonical structure for a new snailicid3
monorepo package. It shows the standard tsdown config, tsconfig, package.json layout, and vitest
test setup.

### Structure

```sh
packages/example-package/
├── src/
│ ├── index.ts       # Public exports
│ └── index.test.ts  # Vitest tests
├── tsdown.config.ts # tsdown build config
├── tsconfig.json    # TypeScript config
└── package.json     # Package manifest
```

## Usage

Copy this package as a starting point for new packages:

```sh
cp -r packages/example-package packages/my-new-package
# Update name, description, and dependencies in package.json
```
