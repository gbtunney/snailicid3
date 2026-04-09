import { guardToAssertion, predicateToAssertion } from './assertation.js'
import * as tgJson from './json.typeguards.js'
import * as _tg from './utility.typeguards.js'

// Note: isNumeric/isParsableToNumeric → @snailicid3/utils (number/)
//       isCSSColorSpecial → @snailicid3/color
//       isZodParsable → @snailicid3/zod-helpers
//       All three were removed to avoid circular dependency with types

/** @namespace Typeguard Functions */
export const tg = {
    ..._tg,
    ...tgJson,
    guardToAssertion,
    predicateToAssertion,
}
export default tg
