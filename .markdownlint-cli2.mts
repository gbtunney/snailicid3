import { Markdownlint } from '@snailicid3/config'

export default Markdownlint.defineConfig(
    Markdownlint.config({ cwd: import.meta }),
)
