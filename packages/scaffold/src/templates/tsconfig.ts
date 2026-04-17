import type { ScaffoldInput } from '../input.js'

export const generateTsConfig = (_input: ScaffoldInput): Record<string, unknown> => ({
    compilerOptions: {
        declaration: true,
        declarationMap: true,
        outDir: './dist',
        rootDir: './src',
        sourceMap: true,
    },
    extends: '@snailicid3/config/tsconfig-base',
    include: ['./src/**/*.ts'],
})
