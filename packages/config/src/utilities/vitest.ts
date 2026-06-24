import { expect } from 'vitest'

/** Vitest helper */
export const expectDefined = <Type>(value: Type | undefined): Type => {
    expect(value).toBeDefined()

    if (value === undefined) {
        throw new Error('Expected value to be defined.')
    }

    return value
}
