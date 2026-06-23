import { EsLint } from '@snailicid3/config'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('.', import.meta.url))
const CONFIG = EsLint.config({ cwd })

export default EsLint.defineConfig(CONFIG)
