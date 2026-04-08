import type { ScaffoldInput } from '../input.js'

export const generateRollupConfig = (input: ScaffoldInput): string =>
    `import { rollup } from '@snailicid3/build-config'
import type { RollupOptions } from 'rollup'

import pkg from './package.json' with { type: 'json' }

const directory_paths = {
    output_dir: './dist/',
    source_dir: './src/',
}

const CONFIG_OBJ = [
    ...rollup.getConfigEntries(
        directory_paths,
        [
            {
                export_key: '*',
                export_types: ['import', 'types'],
                library_name: '${input.name}',
            },
        ],
        rollup.DEFAULT_PLUGINS_BUNDLED,
        pkg,
    ),
]

const CONFIG: Array<RollupOptions> = rollup.getRollupConfig(CONFIG_OBJ)

export default CONFIG
`
