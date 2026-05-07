import type z from 'zod'
import { type schemaBasePackage } from './schemas/index.js'
export const defineBuildPlan = (
    pkg: z.infer<typeof schemaBasePackage>,
): void => {
    console.log('defining build plan for package', pkg)
}
