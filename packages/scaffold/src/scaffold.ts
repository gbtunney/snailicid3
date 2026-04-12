import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { ScaffoldInput } from './input.js'
import { generatePackageJson } from './templates/package-json.js'
import { generateReadme } from './templates/readme.js'
import { generateRollupConfig } from './templates/rollup-config.js'
import { generateTsConfig } from './templates/tsconfig.js'

export const scaffoldPackage = (input: ScaffoldInput, outDir: string): void => {
    mkdirSync(join(outDir, 'src'), { recursive: true })

    writeFileSync(
        join(outDir, 'package.json'),
        JSON.stringify(generatePackageJson(input), null, 4) + '\n',
    )
    writeFileSync(
        join(outDir, 'tsconfig.json'),
        JSON.stringify(generateTsConfig(input), null, 4) + '\n',
    )
    writeFileSync(join(outDir, 'rollup.config.mts'), generateRollupConfig(input))
    writeFileSync(join(outDir, 'README.md'), generateReadme(input))
    writeFileSync(join(outDir, 'src/index.ts'), `// @snailicid3/${input.name}\n`)
}
