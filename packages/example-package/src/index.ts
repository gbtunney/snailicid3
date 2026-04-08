/* * JSON TYPES and UTILS * */

export type HelloWorld = string | number

/** Returns the input value unchanged. */
export function echoHelloWorld(value: HelloWorld): HelloWorld {
    return value
}
