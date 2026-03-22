export type HelloWorld = string | number

export const sampleFunc = (value: HelloWorld): HelloWorld => {
    console.log('sampleFunc:: ', value)
    return value
}
