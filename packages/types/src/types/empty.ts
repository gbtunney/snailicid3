/** @group Empty Types */
import type { EmptyObject } from 'type-fest'

/* * EMPTY TYPES  * */
/** @group Empty Types */
export type EmptyArray = readonly []

/** @group Empty Types */
export type EmptyString = ''
/** @group Empty Types */
export type Falsy = 0 | 'Nan' | EmptyString | false | null | undefined

/** @group Empty Types */
export type NilLike = EmptyString | Nullish

/** @group Empty Types */
export type NilOrEmpty = EmptyArray | EmptyObject | EmptyString | Nullish

/** @group Empty Types */
export type Nullish = null | undefined

export type { EmptyObject } from 'type-fest' //nullish but with empty string
