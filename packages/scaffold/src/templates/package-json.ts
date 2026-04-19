import type { ScaffoldInput } from '../input.js'

export const generatePackageJson = (input: ScaffoldInput): Record<string, unknown> => ({
    author: {
        email: 'gbtunney@mac.com',
        name: 'Gillian Tunney',
    },
    dependencies: {},
    description: input.description,
    devDependencies: {
        '@snailicid3/config': 'workspace:*',
        '@types/node': '^22.0.0',
        typescript: '^5.7.0',
        vitest: '^2.1.0',
    },
    exports: {
        '.': {
            import: './dist/index.js',
            types: './dist/index.d.ts',
        },
    },
    files: ['CHANGELOG.md', 'dist'],
    license: 'MIT',
    main: './dist/index.js',
    name: `@snailicid3/${input.name}`,
    private: false,
    repository: {
        type: 'git',
        url: 'https://github.com/gbtunney/snailicid3-monorepo',
    },
    scripts: {
        '\n========== DEVELOPMENT >> ==========': '',
        '\n========== TEST >> ==========': '',
        dev: 'tsc --build --watch',
        'test:coverage': 'vitest run --coverage',
        'test:watch': 'vitest watch',
    },
    type: 'module',
    types: './dist/index.d.ts',
    version: '0.0.0',
})
