import type z from 'zod'
import { schemaBasePackage } from './schemas/index.js'
import {
    schemaBuildPlanEntrySpec,
    schemaBuildPlanRoot,
} from './schemas/plan.js'
export const defineTopLevelBuildPlan = <
    const Type extends z.input<typeof schemaBasePackage>,
>(
    pkg: Type,
    plan: z.input<typeof schemaBuildPlanRoot>,
): void => {
    const parsedPkg: z.output<typeof schemaBasePackage> =
        schemaBasePackage.parse(pkg)

    const buildPlanRoot: z.output<typeof schemaBuildPlanRoot> =
        schemaBuildPlanRoot.parse(plan)

    console.log('defining build plan for package', buildPlanRoot)
}

export const defineEntryBuildPlan = <
    const Type extends z.input<typeof schemaBasePackage>,
>(
    pkg: Type,
    root_plan: z.input<typeof schemaBuildPlanRoot>,
    entry_plan: z.input<typeof schemaBuildPlanRoot>,
): void => {
    const parsedPkg: z.output<typeof schemaBasePackage> =
        schemaBasePackage.parse(pkg)

    const buildPlanRoot: z.output<typeof schemaBuildPlanRoot> =
        schemaBuildPlanRoot.parse(root_plan)
    const _merged = { ...buildPlanRoot, ...entry_plan }

    const buildPlanEntry: z.output<typeof schemaBuildPlanEntrySpec> =
        schemaBuildPlanEntrySpec.parse(_merged)
    console.log(
        'defining build plan for package',
        buildPlanRoot,
        buildPlanEntry,
    )
    console.log('dinner parsed', buildPlanEntry)
}
