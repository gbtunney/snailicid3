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
 *         cwd: import.meta,
 *         scopeOptions: { mergeScopes: ['stupid'] },
 *         appendTypes: ['derp'],
 *     })
 *     ```
 */
const configuration: CommitlintConfig = Commitlint.defineConfig(
    Commitlint.config({ cwd: import.meta }),
)
export default configuration
