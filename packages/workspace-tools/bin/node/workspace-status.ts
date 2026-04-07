#!/usr/bin/env tsx
import { execCommand } from '../../src/exec.js'

const result = execCommand('pnpm outdated -r', false)
console.log(result)
