/**
 * @file Commitlint configuration for the Monorepo.
 * @author Gillian Tunney
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 */
import { commitlint, CommitlintUserConfig } from '@snailicid3/config'

const configuration: CommitlintUserConfig = commitlint.configuration([
    'root',
    'actions',
    'notes',
    'config',
    'build-config',
    'types',
    'utils',
    'cli-app',
    'color',
    'logger',
    'node-utils',
    'scaffold',
    'example-package',
    'playground',
])
export default configuration
