# @snailicid3/storybook-config 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/storybook-config)](https://www.npmjs.com/package/@snailicid3/storybook-config)
[![license](https://img.shields.io/npm/l/@snailicid3/storybook-config)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Shared Storybook configuration with sensible React and Vite defaults._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=for-the-badge&logo=storybook&logoColor=white)](https://storybook.js.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)

### Repository

- **GitHub:**
  [`@snailicid3/storybook-config`](https://github.com/gbtunney/snailicid3/tree/main/packages/storybook-config)
  • [`snailicid3`](https://github.com/gbtunney/snailicid3)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/storybook-config 🐌

---

This package keeps project-level `.storybook` files small and consistent. It provides configuration
builders for Storybook's main, preview, and manager entries, with React and Vite defaults that can
be overridden for an individual project.

### `@snailicid3/storybook-config` contains

- **Main config** — default story globs, `@storybook/react-vite`, Essentials, and a11y
- **Preview config** — default control matchers with project-level parameter overrides
- **Manager config** — a typed passthrough for project-specific manager settings
- **Storybook namespace** — grouped builders and defaults matching the `@snailicid3/config` API
  style

The package only creates configuration objects. Storybook, the selected framework, and addons stay
in the consuming project's dependencies.

## Installation

Install the config package and its default Storybook toolchain as development dependencies:

```sh
pnpm add --save-dev \
  @snailicid3/storybook-config \
  storybook \
  @storybook/react-vite \
  @storybook/addon-essentials \
  @storybook/addon-a11y
```

## Examples

### Main configuration

```ts
/* .storybook/main.ts */
import { defineStorybookMain } from '@snailicid3/storybook-config'

export default defineStorybookMain()
```

The default configuration discovers MDX and story files under `src`, uses `@storybook/react-vite`,
and enables the Essentials and a11y addons.

### Preview configuration

```ts
/* .storybook/preview.ts */
import { defineStorybookPreview } from '@snailicid3/storybook-config'

export default defineStorybookPreview({
  parameters: {
    layout: 'centered',
  },
})
```

### Extending the main configuration

```ts
/* .storybook/main.ts */
import { defineStorybookMain } from '@snailicid3/storybook-config'

export default defineStorybookMain({
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  stories: ['../stories/**/*.stories.tsx'],
  overrides: {
    docs: { autodocs: 'tag' },
  },
})
```

### Using another framework

Install the framework in the consuming project, then override the default:

```ts
/* .storybook/main.ts */
import { defineStorybookMain } from '@snailicid3/storybook-config'

export default defineStorybookMain({
  framework: '@storybook/web-components-vite',
})
```

### Namespace API

The same builders and defaults are available through the grouped `Storybook` API:

```ts
/* .storybook/main.ts */
import { Storybook } from '@snailicid3/storybook-config'

export default Storybook.main({
  frameworkOptions: {
    strictMode: true,
  },
})
```

### Manager configuration

```ts
/* .storybook/manager.ts */
import { defineStorybookManager } from '@snailicid3/storybook-config'

export default defineStorybookManager({
  enableShortcuts: false,
})
```
