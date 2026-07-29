import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    expectTypeOf,
    it,
} from 'vitest'

import {
    getPathOfType,
    getPathType,
    isPathType,
    requirePathOfType,
    type TypedPath,
} from './path.typed.js'
import { fsTypedPath } from './zod.node.js'

describe('typed paths', () => {
    let temporaryDirectory: string
    let directoryPath: string
    let filePath: string
    let symlinkPath: string

    beforeAll(() => {
        temporaryDirectory = fs.mkdtempSync(
            path.join(os.tmpdir(), 'snailicid3-node-utils-'),
        )
        directoryPath = path.join(temporaryDirectory, 'directory')
        filePath = path.join(temporaryDirectory, 'example.txt')
        symlinkPath = path.join(temporaryDirectory, 'example-link')

        fs.mkdirSync(directoryPath)
        fs.writeFileSync(filePath, 'example')
        fs.symlinkSync(filePath, symlinkPath)
    })

    afterAll(() => {
        fs.rmSync(temporaryDirectory, {
            force: true,
            recursive: true,
        })
    })

    it('classifies directories, files, globs, symlinks and unknown paths', () => {
        expect(getPathType(directoryPath).type).toBe('directory')
        expect(getPathType(filePath).type).toBe('file')
        expect(getPathType(`${temporaryDirectory}/*.txt`).type).toBe('glob')
        expect(getPathType(symlinkPath).type).toBe('symlink')
        expect(getPathType(path.join(temporaryDirectory, 'missing')).type).toBe(
            'unknown',
        )
        expect(getPathType(undefined)).toEqual({
            path: '',
            type: 'unknown',
        })
    })

    it('narrows a classified result with isPathType', () => {
        const result = getPathType(directoryPath)

        expect(isPathType(result, 'directory')).toBe(true)
        expect(isPathType(result, 'file')).toBe(false)

        if (isPathType(result, 'directory')) {
            expectTypeOf(result.path).toEqualTypeOf<TypedPath<'directory'>>()
        }
    })

    it('returns a branded path only for the requested type', () => {
        const directory = getPathOfType(directoryPath, 'directory')
        const rejectedFile = getPathOfType(filePath, 'directory')

        expect(directory).toBe(path.resolve(directoryPath))
        expect(rejectedFile).toBeUndefined()
        expectTypeOf(directory).toEqualTypeOf<
            TypedPath<'directory'> | undefined
        >()
    })

    it('throws when requirePathOfType receives a different path type', () => {
        expect(requirePathOfType(directoryPath, 'directory')).toBe(
            path.resolve(directoryPath),
        )
        expect(() => requirePathOfType(filePath, 'directory')).toThrowError(
            'Expected path type "directory", received "file"',
        )
    })

    it('keeps brands distinct at compile time', () => {
        expectTypeOf<string>().not.toExtend<TypedPath<'directory'>>()
        expectTypeOf<TypedPath<'file'>>().not.toExtend<
            TypedPath<'directory'>
        >()
        expectTypeOf<TypedPath<'directory'>>().toExtend<string>()
    })

    it('parses and brands a requested path type with Zod', () => {
        const schema = fsTypedPath('directory')
        const directory = schema.parse(directoryPath)

        expect(directory).toBe(path.resolve(directoryPath))
        expect(schema.safeParse(filePath).success).toBe(false)
        expectTypeOf(directory).toEqualTypeOf<TypedPath<'directory'>>()
    })

    it('resolves relative Zod paths against a root', () => {
        const schema = fsTypedPath('file', temporaryDirectory)
        const file = schema.parse('example.txt')

        expect(file).toBe(path.resolve(filePath))
        expectTypeOf(file).toEqualTypeOf<TypedPath<'file'>>()
    })
})
