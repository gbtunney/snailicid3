import type { Simplify } from 'type-fest'
export type OmitKeyDelimiterAliases<
    TObject extends PlainObject,
    AliasDelimiter extends string,
    CanonicalDelimiter extends string,
> = Simplify<{
    [Key in keyof TObject as Key extends string
        ? Key extends `${string}${AliasDelimiter}${string}`
            ? ReplaceAll<
                  Key,
                  AliasDelimiter,
                  CanonicalDelimiter
              > extends keyof TObject
                ? never
                : Key
            : Key
        : Key]: TObject[Key]
}>
export type PlainObject = {
    [x: string]: unknown
    [y: number]: never
}

export type ReplaceAll<
    Value extends string,
    Search extends string,
    Replacement extends string,
> = Value extends `${infer Head}${Search}${infer Tail}`
    ? `${Head}${Replacement}${ReplaceAll<Tail, Search, Replacement>}`
    : Value
