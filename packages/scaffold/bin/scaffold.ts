#!/usr/bin/env tsx
import { initApp } from '@snailicid3/cli-app'
import { z } from 'zod'

import { scaffoldInputSchema, scaffoldPackage, syncPackage } from '../src/index.js'

const schema = scaffoldInputSchema.extend({
    dir: z.string().optional().meta({
        alias: 'd',
        description: '<path> Target output directory (defaults to ./packages/<name>)',
    }),
    sync: z.boolean().default(false).meta({
        alias: 's',
        description: 'Sync an existing package instead of creating a new one',
    }),
})

await initApp(
    schema,
    {
        description: 'Scaffold a new @snailicid3 package',
        name: 'scaffold',
        version: '0.0.0',
    },
    (args) => {
        const outDir = args.dir ?? `./packages/${args.name}`
        if (args.sync) {
            const results = syncPackage(args, outDir)
            for (const r of results) {
                const suffix = r.reason ? ` (${r.reason})` : ''
                console.log(`${r.action}: ${r.file}${suffix}`)
            }
        } else {
            scaffoldPackage(args, outDir)
            console.log(`Scaffolded @snailicid3/${args.name} → ${outDir}`)
        }
    },
)
