import { type TypeDocOptions } from 'typedoc'
import type { ConfigFunctionOptions } from '../core/index.js'
import { doesFileExist, getFilePath, normalizePath } from '../utilities/path.js'

export type TypedocConfigFunction<Type extends object = object> = (
    input?: TypedocConfigFunctionOptions<Type>,
) => TypedocOptions<Type>
export type TypedocConfigFunctionOptions<Type extends object = object> =
    ConfigFunctionOptions & {
        /** Working directory fallback when `dirname` is not provided. */
        cwd?: string
        /** Directory containing the package being documented. Defaults to `cwd`. */
        dirname?: string
        /** Module metadata for resolving the package directory from a config file. */
        meta?: ImportMeta
        /** Merged on top of the generated TypeDoc config. */
        overrides?: TypedocOptions<Type>
    }
export type TypedocFileOptions = Pick<
    TypeDocOptions,
    'entryPoints' | 'exclude' | 'gitRevision' | 'out' | 'readme' | 'tsconfig'
>

export type TypedocOptions<Type extends object = object> = Partial<
    Type & TypeDocOptions
>

export const resolveTypedocConfigInput = <Type extends object = object>({
    cwd = process.cwd(),
    dirname,
    meta,
    overrides = {},
}: TypedocConfigFunctionOptions<Type> = {}): {
    dirname: string
    overrides: TypedocOptions<Type>
} => ({
    dirname: dirname ?? (meta ? getFilePath(meta, '') : cwd),
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
