import z from 'zod'
import {
    BROWSER_ENGINES,
    ECMA_SCRIPT_TARGET,
    RUNTIME_ENGINES,
    SEMVER_REGEX,
} from './constants.js'

const ecmaScriptTargetSchema = z.enum(ECMA_SCRIPT_TARGET)
const browserEngineSchema = z.enum(BROWSER_ENGINES)
const runtimeEngineSchema = z.enum(RUNTIME_ENGINES)

/*
export const engineNameSchema = z.union([
  browserEngineSchema,
  runtimeEngineSchema,
])
*/
const engineTargetSchema = z.templateLiteral([
    z.union([browserEngineSchema, runtimeEngineSchema]),
    // z.number().int().positive(),
    z.string().regex(SEMVER_REGEX),
])

export const schemaTranspileChoices = z.union([
    ecmaScriptTargetSchema,
    engineTargetSchema,
])
export const schemaTranspile = z.union([
    z.boolean(),
    z.literal('none'),
    z.array(schemaTranspileChoices),
])
