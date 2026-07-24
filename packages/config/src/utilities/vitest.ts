import { expect } from 'vitest'

/** Assert that a value is defined and return it with undefined removed from its type. */
export const expectDefined = <Type>(value: Type | undefined): Type => {
    expect(value).toBeDefined()

    if (value === undefined) {
        throw new Error('Expected value to be defined.')
    }

    return value
}
