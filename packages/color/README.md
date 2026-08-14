# @snailicid3/color 🐌

[![npm](https://img.shields.io/npm/v/@snailicid3/color)](https://www.npmjs.com/package/@snailicid3/color)
[![license](https://img.shields.io/npm/l/@snailicid3/color)](../../LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)

_Color math, parsing, conversion, and hex utilities powered by chroma.ts and colorjs.io._

---

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CSS](https://img.shields.io/badge/CSS_Color-663399?style=for-the-badge&logo=css&logoColor=white)](https://www.w3.org/TR/css-color-4/)

### Repository

- **GitHub:** [`@snailicid3/color`](https://github.com/gbtunney/snailicid3/tree/main/packages/color)
  • [`snailicid3`](https://github.com/gbtunney/snailicid3)
- **CDN:** [jsDelivr](https://cdn.jsdelivr.net/npm/@snailicid3/color/dist/index.min.js)

### Author

👤 **Gillian Tunney**

- [GitHub](https://github.com/gbtunney)
- [Email](mailto:gbtunney@mac.com)

> Recommended package manager: [pnpm](https://pnpm.io/)
>
> [![pnpm](https://img.shields.io/badge/pnpm-4A4A4A?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io/)

## @snailicid3/color 🐌

---

This package provides color math, CSS color parsing, hex conversion, contrast calculation, and
chroma utilities. It wraps [chroma.ts](https://github.com/nicholasgasior/chroma.ts) and
[colorjs.io](https://colorjs.io) with a consistent API and adds branded `HexColor` types.

### `@snailicid3/color` _contains:_

- **Hex utilities** — `isHexColor`, `parseColorToHex`, `assertHexColor`, `toHex`
- **CSS color parsing** — `parseColorJS`, `isValidColor` via colorjs.io
- **Chroma utilities** — `colorUtils.isValidColor`, `colorUtils.getColor`, `colorUtils.complement`,
  `colorUtils.triad`
- **Contrast** — `apcaContrast`, `readableTextHex`
- **Types** — `HexColor`, `ColorJS`, `ColorTheme`

## Installation

```sh
pnpm add @snailicid3/color
```

## Examples

### Parse CSS colors to hex

```ts
import { isHexColor, parseColorToHex, isValidColor } from '@snailicid3/color'

isHexColor('#FF0000') // true
isHexColor('red') // false
isValidColor('red') // true
parseColorToHex('red') // '#FF0000'
parseColorToHex('#336699') // '#336699'
```

### Chroma utilities

```ts
import { colorUtils } from '@snailicid3/color'

colorUtils.isValidColor('blue') // true
colorUtils.complement('red') // Color (180° hue rotation)
```

### Accessible contrast

```ts
import { parseColorJS, readableTextHex } from '@snailicid3/color'

readableTextHex('#336699') // 'black' or 'white' based on APCA contrast
```
