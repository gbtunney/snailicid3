import type { ScaffoldInput } from '../input.js'

export const generatePackageJson = (
    input: ScaffoldInput,
): Record<string, unknown> => ({
    name: `@snailicid3/${input.name}`,
    version: '0.0.0',
    private: false,
    description: input.description,
    type: 'module',
    exports: {
        '.': {
            import: './dist/index.js',
            types: './dist/index.d.ts',
        },
    },
    main: './dist/index.js',
    types: './dist/index.d.ts',
    files: ['CHANGELOG.md', 'dist'],
    scripts: {
        '\n========== DEVELOPMENT >> ==========': '',
        dev: 'tsc --build --watch',
        '\n========== TEST >> ==========': '',
        'test:watch': 'vitest watch',
        'test:coverage': 'vitest run --coverage',
    },
    dependencies: {},
    devDependencies: {
        '@snailicid3/config': 'workspace:*',
        '@types/node': '^22.0.0',
        typescript: '^5.7.0',
        vitest: '^2.1.0',
    },
    author: {
        name: 'Gillian Tunney',
        email: 'gbtunney@mac.com',
    },
    license: 'MIT',
    repository: {
        type: 'git',
        url: 'https://github.com/gbtunney/snailicid3-monorepo',
    },
})
