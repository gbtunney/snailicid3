/** Re-exports color utilities from the snailicid3 color package for use within logger. */
import {
    type parseColorJS,
    type parseColorToHexStrict,
} from '@snailicid3/color'

export type ColorJS = ReturnType<typeof parseColorJS>
export type HexColor = ReturnType<typeof parseColorToHexStrict>

export {
    parseColorJS,
    parseColorToHexStrict,
    readableTextHex,
} from '@snailicid3/color'
