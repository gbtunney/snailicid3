import ora from 'ora'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createProgressBar, createSpinner } from './spinner.js'

const spinner = {
    fail: vi.fn(),
    info: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    stopAndPersist: vi.fn(),
    succeed: vi.fn(),
    text: '',
    warn: vi.fn(),
}

vi.mock('ora', () => ({
    default: vi.fn(() => spinner),
}))

describe('createSpinner', () => {
    beforeEach(() => {
        spinner.start.mockClear()
        spinner.stop.mockClear()
        spinner.stopAndPersist.mockClear()
        spinner.succeed.mockClear()
        spinner.fail.mockClear()
        spinner.warn.mockClear()
        spinner.info.mockClear()
        spinner.text = ''
        spinner.start.mockReturnValue(spinner)
        vi.mocked(ora).mockClear()
    })

    test('starts once, updates text, and stops', () => {
        const progress = createSpinner('Working...')

        expect(progress.status).toBe('idle')
        progress.start()
        progress.start()
        expect(progress.status).toBe('spinning')
        progress.setText('Still working...')
        progress.stop()

        expect(ora).toHaveBeenCalledWith({ text: 'Working...' })
        expect(spinner.start).toHaveBeenCalledOnce()
        expect(spinner.text).toBe('Still working...')
        expect(spinner.stop).toHaveBeenCalledOnce()
        expect(progress.status).toBe('idle')
    })

    test('reports semantic finish states', () => {
        const success = createSpinner('Build')
        success.succeed('Built!')
        expect(spinner.succeed).toHaveBeenCalledWith('Built!')
        expect(success.status).toBe('succeeded')

        const failure = createSpinner('Test')
        failure.fail('Failed!')
        expect(spinner.fail).toHaveBeenCalledWith('Failed!')
        expect(failure.status).toBe('failed')

        const warning = createSpinner('Lint')
        warning.warn('Skipped')
        expect(spinner.warn).toHaveBeenCalledWith('Skipped')
        expect(warning.status).toBe('warning')

        const information = createSpinner('Cache')
        information.info('Cached')
        expect(spinner.info).toHaveBeenCalledWith('Cached')
        expect(information.status).toBe('info')
    })

    test('persists a snail status by default', () => {
        const progress = createSpinner('Migration')
        progress.persist('Moved')

        expect(spinner.stopAndPersist).toHaveBeenCalledWith({
            symbol: '🐌',
            text: 'Moved',
        })
        expect(progress.status).toBe('persisted')
    })

    test('retains the progress-bar compatibility alias', () => {
        expect(createProgressBar).toBe(createSpinner)
    })
})
