#!/usr/bin/env node

import { parseArgv, runCliIfEntrypoint } from '@snailicid3/node-utils'
import { z } from 'zod'
import { runDoctor } from './doctor.js'
import { formatDoctorJson, formatDoctorText } from './format.js'

const optionSchema = z.object({
    json: z.boolean().default(false),
    package: z.union([z.string(), z.array(z.string())]).optional(),
})

const positionalSchema = z.array(z.string()).max(1)

const HELP = `Usage: snail-doctor [path] [options]

Read-only package and artifact diagnostics.

Options:
  --package <name>  Limit the report to one package; repeat to select more
  --json            Emit the complete report as JSON
  -h, --help        Show this help

Findings do not fail the process. Operational errors still exit non-zero.`

export default function main(
    args: ReadonlyArray<string> = process.argv.slice(2),
): void {
    if (args.includes('--help') || args.includes('-h')) {
        console.log(HELP)
        return
    }

    const parsed = parseArgv(optionSchema, args, positionalSchema)
    const packageNames = normalizePackageNames(parsed.options.package)
    const report = runDoctor({
        packageNames,
        root: parsed.positionals[0] ?? process.cwd(),
    })

    console.log(
        parsed.options.json
            ? formatDoctorJson(report)
            : formatDoctorText(report),
    )
}

function normalizePackageNames(
    value: ReadonlyArray<string> | string | undefined,
): ReadonlyArray<string> {
    if (value === undefined) return []
    return typeof value === 'string' ? [value] : value
}

runCliIfEntrypoint(import.meta, main, process.argv.slice(2))
