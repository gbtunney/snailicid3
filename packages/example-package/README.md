# @snailicid3/example-package 🐌

> _Workspace package — example template for new monorepo packages_

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

### Repository

- **Github:**
  [`@snailicid3/example-package`](https://github.com/gbtunney/snailicid3/tree/main/packages/example-package)
  • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

## @snailicid3/example-package 🐌

---

This is an example/template package demonstrating the canonical structure for a
new snailicid3 monorepo package. It shows the standard tsdown config, tsconfig,
package.json layout, and vitest test setup.

### Structure

```
packages/example-package/
├── src/
│   ├── index.ts          # Public exports
│   └── index.test.ts     # Vitest tests
├── tsdown.config.ts      # tsdown build config
├── tsconfig.json         # TypeScript config
└── package.json          # Package manifest
```

## Usage

Copy this package as a starting point for new packages:

```sh
cp -r packages/example-package packages/my-new-package
# Update name, description, and dependencies in package.json
```
