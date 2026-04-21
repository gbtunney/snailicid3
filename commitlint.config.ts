/**
 * @file Commitlint configuration for the Monorepo.
 * @author Gillian Tunney
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 */
import { commitlint, CommitlintUserConfig } from '@snailicid3/config'

const configuration: CommitlintUserConfig = commitlint.configuration([
    'root',
    '@snailicid3/config',
    '@snailicid3/build-config',
    '@snailicid3/types',
    '@snailicid3/utils',
    '@snailicid3/cli-app',
    '@snailicid3/color',
    'notes',
    '@snailicid3/example-package',
    '@snailicid3/logger',
    '@snailicid3/node-utils',
    '@snailicid3/scaffold',
    '@snailicid3/workspace-tools',
    '@snailicid3/playground',
])
export default configuration
