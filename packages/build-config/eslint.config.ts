import { EsLint } from '@snailicid3/config'
import url from 'node:url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const CONFIG = await EsLint.config(__dirname)
export default EsLint.defineConfig(CONFIG)
