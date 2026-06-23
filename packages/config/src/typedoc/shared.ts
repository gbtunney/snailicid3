import { type TypeDocOptions } from 'typedoc'
import type { ConfigFunctionOptions } from '../core/index.js'
import {
    doesFileExist,
    getFilePath,
    normalizePath,
    type PathRoot,
    resolveCwd,
} from '../utilities/path.js'

export type TypedocConfigFunction<Type extends object = object> = (
    input?: TypedocConfigFunctionOptions<Type>,
) => TypedocOptions<Type>
export type TypedocConfigFunctionOptions<Type extends object = object> =
    ConfigFunctionOptions<{
        /** Directory containing the package being documented. Defaults to `cwd`, then `process.cwd()`. */
        dirname?: PathRoot
        /** Merged on top of the generated TypeDoc config. */
        overrides?: TypedocOptions<Type>
    }>
export type TypedocFileOptions = Pick<
    TypeDocOptions,
    'entryPoints' | 'exclude' | 'gitRevision' | 'out' | 'readme' | 'tsconfig'
>

export type TypedocOptions<Type extends object = object> = Partial<
    Type & TypeDocOptions
>

export const resolveTypedocConfigInput = <Type extends object = object>({
    cwd,
    dirname,
    overrides = {},
}: TypedocConfigFunctionOptions<Type> = {}): {
    dirname: string
    overrides: TypedocOptions<Type>
} => ({
    dirname: resolveCwd(dirname ?? cwd),
    overrides,
})

export const fileSharedOptions = (__dirname: string): TypedocOptions => {
    const resolvedDirname = normalizePath(__dirname)
    if (!doesFileExist(resolvedDirname)) {
        throw new Error(`Directory does not exist: ${resolvedDirname}`)
    }

    return {
        /** This uses a "module" format, using the index of each subfolder */
        entryPoints: [getFilePath(resolvedDirname, 'src/index.ts')],
        exclude: ['**/*.test.ts', 'node_modules/**/*', '**/node_modules/**/*'],
        gitRevision: 'master',
        out: getFilePath(resolvedDirname, 'docs'),
        readme: getFilePath(resolvedDirname, 'README.md'),
        tsconfig: getFilePath(resolvedDirname, 'tsconfig.docs.json'),
    }
}
