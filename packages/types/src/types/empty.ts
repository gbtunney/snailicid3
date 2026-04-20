/** @group Empty Types */
import type {
    EmptyObject,
} from 'type-fest'

/* * EMPTY TYPES  * */
/** @group Empty Types */
export type EmptyArray = readonly []

/** @group Empty Types */
export type EmptyString = ''
/** @group Empty Types */
export type Falsy = false | 0 | EmptyString | null | undefined | 'Nan'

/** @group Empty Types */
export type Nullish = null | undefined

/** @group Empty Types */
export type NilOrEmpty = EmptyObject | EmptyArray | EmptyString | Nullish

/** @group Empty Types */
export type NilLike = EmptyString | Nullish

export type { EmptyObject } from 'type-fest' //nullish but with empty string
