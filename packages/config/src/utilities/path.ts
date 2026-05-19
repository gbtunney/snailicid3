import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const getFilePath = (meta: ImportMeta, filePath: string): string => {
    const directoryPath = path.dirname(fileURLToPath(meta.url))

    if (!fs.existsSync(path.resolve(directoryPath))) {
        throw new Error(
            `Directory does not exist: ${path.resolve(directoryPath)}`,
        )
    }

    return path.resolve(`${directoryPath}/${filePath}`)
}
