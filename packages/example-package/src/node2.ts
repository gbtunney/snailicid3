import { dumbVariable1 } from './random/randomfile.js'

export type NodeRuntimeValue = {
    runtime: 'node'
    value: string
}
export const testme = { helllo: dumbVariable1 }

export const testme2 = { 'another key here': 'im an object' }

export const gbtT = { ...testme, ...testme2 }

export function asNodeRuntimeValue(value: string): NodeRuntimeValue {
    return {
        runtime: 'node',
        value,
    }
}

export { DUM_VARIABLE, dumbVariable4 } from './random/randomfile.js'
