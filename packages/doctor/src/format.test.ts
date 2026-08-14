import { describe, expect, it } from 'vitest'
import { formatDoctorJson, formatDoctorText } from './format.js'
import type { DoctorReport } from './types.js'

const report: DoctorReport = {
    diagnostics: [
        {
            code: 'EXPORT_TYPES_CONDITION_MISSING',
            evidence: ['package.json#types -> ./dist/index.d.ts'],
            fixtureId: 'EXP-LOGGER-001',
            message: 'Missing root types condition.',
            packageName: '@snailicid3/logger',
            packageRoot: '/repo/packages/logger',
            severity: 'warning',
        },
    ],
    packages: [
        {
            diagnostics: [],
            manifestPath: '/repo/packages/logger/package.json',
            packageName: '@snailicid3/logger',
            packageRoot: '/repo/packages/logger',
        },
    ],
    root: '/repo',
    summary: {
        findings: 1,
        knownFixtureFindings: 1,
        packages: 1,
        unregisteredFindings: 0,
    },
}

describe('Doctor report formatting', () => {
    it('distinguishes known fixtures and states that the report is read-only', () => {
        const output = formatDoctorText(report)

        expect(output).toContain('known fixture EXP-LOGGER-001')
        expect(output).toContain('Read-only report: no files were changed.')
    })

    it('emits the complete report as JSON', () => {
        expect(JSON.parse(formatDoctorJson(report))).toEqual(report)
    })
})
