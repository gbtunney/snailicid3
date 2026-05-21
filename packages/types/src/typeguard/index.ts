import { type Spread } from 'type-fest'
import * as assertions from './assertation.js'
import * as tgJson from './json.typeguards.js'
import * as _tg from './utility.typeguards.js'
// Note: isNumeric/isParsableToNumeric → @snailicid3/utils (number/)
//       isCSSColorSpecial → @snailicid3/color
//       isZodParsable → @snailicid3/zod-helpers
//       All three were removed to avoid circular dependency with types

type TG = Spread<Spread<typeof _tg, typeof tgJson>, typeof assertions>
/** @namespace Typeguard Functions */
export const tg: TG = {
    ..._tg,
    ...tgJson,
    ...assertions,
}
export default tg
