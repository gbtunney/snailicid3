/**
 * @file Commitlint configuration for the Monorepo.
 * @author Gillian Tunney
 * @see [commitlint - Lint commit messages](https://commitlint.js.org/#/)
 */
import { Commitlint, type CommitlintConfig } from '@snailicid3/config'

/**
 * @example
 *     ;```ts
 *     Commitlint.config({
 *         scopeOptions: { mergeScopes: ['stupid'] },
 *         appendTypes: ['derp'],
 *     })
 *     ```
 */
const configuration: CommitlintConfig = Commitlint.defineConfig(
    Commitlint.config(),
)
export default configuration
