import {
    exampleAppConfig,
    exampleOptionsSchema,
    printExampleResult,
} from './example-options.js'
import { initApp } from '../index.js'

await initApp(exampleOptionsSchema, exampleAppConfig, printExampleResult)
