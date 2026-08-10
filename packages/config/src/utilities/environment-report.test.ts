import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { formatEnvironmentReport } from './environment-report.js'

describe('environment report', () => {
    it('shows resolved values and their sources', () => {
        const repoRoot = mkdtempSync(path.join(tmpdir(), 'environment-report-'))

        try {
            writeFileSync(
                path.join(repoRoot, 'package.json'),
                JSON.stringify({ packageManager: 'npm@11.0.0' }),
            )

            const report = formatEnvironmentReport(repoRoot, {
                environment: {
                    PROTECTED_BRANCHES: 'main,release',
                    SKIP_LINT_STAGED: 'true',
                },
            })

            expect(report).toMatchInlineSnapshot(`
              "Environment variables
              VARIABLE                      VALUE         SOURCE
              ----------------------------  ------------  ------------
              PACKAGE_MANAGER               npm           package.json
              SKIP_LINT_STAGED              true          environment
              PROTECTED_BRANCHES            main,release  environment
              SCOPE_COMMIT_SKIP_COMMITLINT  false         default
              ALLOW_DIRTY                   false         default
              BASE_BRANCH                   (empty)       default
              PREFIX                        changeset     default
              PREFIX_OVERRIDE               (empty)       default
              LOGGING                       false         default
              COMMAND_NAME                  gbt-exec      default
              GBT_PATCH_CWD                 (empty)       default"
            `)
        } finally {
            rmSync(repoRoot, { force: true, recursive: true })
        }
    })
})
