/**
 * @file Commitlint configuration.
 * @author Gillian Tunney
 * @see https://commitlint.js.org
 *
 * TODO: update scope-enum as packages are added.
 * Scopes should match package names without the @snailicid3/ prefix.
 */
import type { UserConfig } from '@commitlint/types'

const config: UserConfig = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'scope-enum': [
            2,
            'always',
            [
                // root / repo level
                'root',
                'repo',
                'scripts',
                // packages — add as created
                'config',
                'build-config',
                'types',
                'utils',
                'color',
                'zod-helpers',
                'node-utils',
                'logger',
                'cli-app',
                'scaffold',
                'workspace-tools',
                // apps
                'playground',
            ],
        ],
        'scope-empty': [1, 'never'],
    },
}

export default config
