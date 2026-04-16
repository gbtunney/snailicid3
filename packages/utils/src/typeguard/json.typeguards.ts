/**
 * Re-exports JSON type guards from @snailicid3/types.
 */
import { tg } from '@snailicid3/types'

export const {
    isJsonifiable,
    isJsonValue,
    isJsonifiableObjectLike,
    isJsonifiableObject,
    isJsonifiableArray,
} = tg
