/* * JSON TYPES and UTILS * */

export type HelloWorld = number | string

/** Returns the input value unchanged. */
export function echoHelloWorld(value: HelloWorld): HelloWorld {
    return value
}
