import type { ScaffoldInput } from '../input.js'

export const generateTsConfig = (
    _input: ScaffoldInput,
): Record<string, unknown> => ({
    extends: '@snailicid3/config/tsconfig-base',
    compilerOptions: {
        rootDir: './src',
        outDir: './dist',
        declaration: true,
        declarationMap: true,
        sourceMap: true,
    },
    include: ['./src/**/*.ts'],
})
