import { EsLint } from '@snailicid3/config'

const CONFIG = EsLint.config({ cwd: import.meta })

export default EsLint.defineConfig(CONFIG)
