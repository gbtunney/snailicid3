# @snailicid3/color 🐌

[![NPM](https://img.shields.io/npm/v/@snailicid3/color)](http://www.npmjs.com/package/@snailicid3/color)
![License: MIT](https://img.shields.io/npm/l/@snailicid3/color)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Color math, parsing, conversion, and hex utilities powered by chroma.ts and colorjs.io._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

### Repository

- **Github:** [`@snailicid3/color`](https://github.com/gbtunney/snailicid3/tree/main/packages/color) • [`snailicid3`](https://github.com/gbtunney/snailicid3.git)
- **CDN**: [jsdeliver](https://cdn.jsdelivr.net/npm/@snailicid3/color/dist/index.min.js)

### Author

👤 **Gillian Tunney**

- [github](https://github.com/gbtunney)
- [email](mailto:gbtunney@mac.com)

> Recommended package manager is [pnpm](http://pnpm.io)
>
> [![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)](http://pnpm.io)

## @snailicid3/color 🐌

---

This package provides color math, CSS color parsing, hex conversion, contrast calculation, and chroma utilities. It wraps [chroma.ts](https://github.com/nicholasgasior/chroma.ts) and [colorjs.io](https://colorjs.io) with a consistent API and adds branded `HexColor` types.

### `@snailicid3/color` _contains:_

- **Hex utilities** — `isHexColor`, `parseColorToHex`, `assertHexColor`, `toHex`
- **CSS color parsing** — `parseColorJS`, `isValidColor` via colorjs.io
- **Chroma utilities** — `colorUtils.isValidColor`, `colorUtils.getColor`, `colorUtils.complement`, `colorUtils.triad`
- **Contrast** — `apcaContrast`, `readableTextHex`
- **Types** — `HexColor`, `ColorJS`, `ColorTheme`

## Installation

```sh
#pnpm
$ pnpm add @snailicid3/color

#yarn
$ yarn add @snailicid3/color

#npm
$ npm install @snailicid3/color
```

## Examples

### Parse CSS colors to hex

```ts
import { isHexColor, parseColorToHex, isValidColor } from '@snailicid3/color'

isHexColor('#FF0000')         // true
isHexColor('red')             // false
isValidColor('red')           // true
parseColorToHex('red')        // '#FF0000'
parseColorToHex('#336699')    // '#336699'
```

### Chroma utilities

```ts
import { colorUtils } from '@snailicid3/color'

colorUtils.isValidColor('blue')    // true
colorUtils.complement('red')       // Color (180° hue rotation)
```

### Accessible contrast

```ts
import { parseColorJS, readableTextHex } from '@snailicid3/color'

readableTextHex('#336699') // 'black' or 'white' based on APCA contrast
```
