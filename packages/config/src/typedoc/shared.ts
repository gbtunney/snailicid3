import { type TypeDocOptions } from 'typedoc'
import fs from 'node:fs'
import path from 'node:path'

export type TypedocConfigFunction<Type extends object = object> = (
    __dirname: string,
    _options?: TypedocOptions<Type>,
) => TypedocOptions<Type> | undefined
export type TypedocFileOptions = Pick<
    TypeDocOptions,
    'entryPoints' | 'exclude' | 'gitRevision' | 'out' | 'readme' | 'tsconfig'
>

export type TypedocOptions<Type extends object = object> = Partial<
    Type & TypeDocOptions
>
export const fileSharedOptions = (
    __dirname: string,
): TypedocOptions | undefined => {
    const resolvedDirname = path.resolve(__dirname)
    if (!fs.existsSync(resolvedDirname)) {
        console.error('The directory ', resolvedDirname, ' does not exist.')
        return undefined
    } else {
        const options: TypedocOptions = {
            /** This uses a "module" format, using the index of each subfolder */
            entryPoints: [path.resolve(`${resolvedDirname}/src/index.ts`)],
            exclude: [
                '**/*.test.ts',
                'node_modules/**/*',
                '**/node_modules/**/*',
            ],
            gitRevision: 'master',
            out: path.resolve(`${resolvedDirname}/docs`),
            readme: path.resolve(`${resolvedDirname}/README.md`),
            tsconfig: path.resolve(`${resolvedDirname}/tsconfig.docs.json`),
        }
        return options
    }
}
