#!/usr/bin/env tsx
import { readFileSync } from 'fs'

function logAffected() {
    try {
        const input = readFileSync(0, 'utf8')

        if (!input.trim()) {
            console.log('No projects affected.')
            return
        }

        const projectNames: Array<string> = JSON.parse(input)

        if (projectNames.length === 0) {
            console.log('\nNo projects affected.\n')
            return
        }

        console.log('\nAffected Projects:')
        projectNames.forEach((name: string) => {
            console.log(`  - ${name}`)
        })
        console.log(`\nTotal: ${String(projectNames.length)} projects\n`)
    } catch (err) {
        console.error('Error parsing affected projects:', err)
    }
}

logAffected()
