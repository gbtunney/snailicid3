import { merge, typedoc } from '@snailicid3/build-config'
import { type TypeDocOptions } from 'typedoc'
import path from 'node:path'
import url from 'node:url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
//import { Options as OptionsVitepress }from 'typedoc-vitepress-theme'

/** @todo: needs to be updated to vitepress */
const custom: Partial<TypeDocOptions> = {
    //  categorizeByGroup: true,
    entryPoints: [path.resolve(`${__dirname}/src/index.ts`)],
    /* excludeInternal: true,
    navigation: {
        includeCategories: true,
        includeFolders: false,
        includeGroups: true,
    },*/
    //plugin: ['typedoc-plugin-remove-references'],
}

const defaultConfig = typedoc.materialTheme(__dirname)

const _typeDocConfig = merge(
    defaultConfig !== undefined ? defaultConfig : {},
    custom,
)

const typeDocConfig: ReturnType<typeof typedoc.materialTheme> = _typeDocConfig
export default typeDocConfig
