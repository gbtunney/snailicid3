/**
 * @file Commitlint configuration for the Monorepo.
 * @author Gillian Tunney
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 */
import { commitlint, type CommitlintUserConfig } from '@snailicid3/config'

/**
 * @example
 *     ;```ts
 *     commitlint.configuration({
 *     mergeScopes: ['stupid'],
 *     mergeTypes: ['derp'],
 *     })
 *     ```
 */
const configuration: CommitlintUserConfig = commitlint.configuration()
export default configuration
