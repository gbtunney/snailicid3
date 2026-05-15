import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { BASE_IGNORES } from './prettier/index.js'

const args = yargs(hideBin(process.argv))
    .option('repo-root', { demandOption: true, type: 'string' })
    .option('gitignore', { default: '.gitignore', type: 'string' })
    .option('out', { default: '.prettierignore.generated', type: 'string' })
    .parseSync()

const gitignorePath = resolve(args.repoRoot, args.gitignore)
const outPath = resolve(args.repoRoot, args.out)

const gitignore = readFileSync(gitignorePath, 'utf8').trimEnd()

const generated = [
    '# Generated. Do not edit.',
    '# Includes .gitignore plus Prettier-only ignores.',
    '',
    gitignore,
    '',
    '# Prettier-only ignores',
    ...BASE_IGNORES,
    '',
].join('\n')

writeFileSync(outPath, generated)
